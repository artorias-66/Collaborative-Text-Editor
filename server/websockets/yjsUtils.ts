import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface WSSharedDoc extends Y.Doc {
    name: string;
    conns: Map<WebSocket, Set<number>>;
    awareness: any;
}

const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;

const updateHandler = (update: Uint8Array, origin: any, doc: WSSharedDoc) => {
    const encoder = encoding.createEncoder();
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    doc.conns.forEach((_, conn) => {
        if (origin !== conn && conn.readyState === WebSocket.OPEN) {
            send(doc, conn, messageSync, message);
        }
    });
};

const getDoc = (docname: string, gc = true): WSSharedDoc => {
    let doc = docs.get(docname);
    if (doc === undefined) {
        doc = new Y.Doc({ gc }) as WSSharedDoc;
        doc.name = docname;
        doc.conns = new Map();
        doc.awareness = new awarenessProtocol.Awareness(doc);
        doc.awareness.setLocalState(null);

        doc.on('update', (update, origin) => updateHandler(update, origin, doc as WSSharedDoc));

        doc.awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
            const changedClients = added.concat(updated).concat(removed);
            const message = awarenessProtocol.encodeAwarenessUpdate(doc!.awareness, changedClients);

            doc!.conns.forEach((_, conn) => {
                if (origin !== conn && conn.readyState === WebSocket.OPEN) {
                    send(doc!, conn, messageAwareness, message);
                }
            });
        });

        docs.set(docname, doc);
    }
    return doc;
};

const send = (doc: WSSharedDoc, conn: WebSocket, mType: number, content: Uint8Array) => {
    if (conn.readyState !== WebSocket.OPEN) {
        closeConn(doc, conn);
        return;
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, mType);
    encoding.writeUint8Array(encoder, content);
    conn.send(encoding.toUint8Array(encoder));
};

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
    if (doc.conns.has(conn)) {
        const controlledIds = doc.conns.get(conn);
        doc.conns.delete(conn);
        if (controlledIds) {
            awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
        }
        if (doc.conns.size === 0) {
            doc.destroy();
            docs.delete(doc.name);
        }
    }
};

export const setupWSConnection = (conn: WebSocket, req: IncomingMessage, { docName = req.url!.slice(1).split('?')[0], gc = true } = {}) => {
    conn.binaryType = 'arraybuffer';
    const doc = getDoc(docName, gc);
    doc.conns.set(conn, new Set());

    conn.on('message', (message: ArrayBuffer) => {
        // message is ArrayBuffer or Buffer
        const messageArray = new Uint8Array(message);
        const decoder = decoding.createDecoder(messageArray);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
            case messageSync:
                {
                    const encoder = encoding.createEncoder();
                    // encoding.writeVarUint(encoder, messageSync); // REMOVED: Don't prefix inside the payload
                    syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
                    if (encoding.length(encoder) > 0) {
                        send(doc, conn, messageSync, encoding.toUint8Array(encoder));
                    }
                }
                break;
            case messageAwareness:
                awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn);
                break;
        }
    });

    conn.on('close', () => {
        closeConn(doc, conn);
    });

    // Sync step 1
    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, messageSync, encoding.toUint8Array(encoder));

    // Awareness states
    if (doc.awareness.getStates().size > 0) {
        const message = awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(doc.awareness.getStates().keys()));
        send(doc, conn, messageAwareness, message);
    }
};
