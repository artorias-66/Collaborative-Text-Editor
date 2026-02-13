import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Editor from '../components/Editor/Editor';

// Mocks
import { documentAPI } from '../services/api';

// Mocks
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ id: '123' }),
    useNavigate: () => jest.fn(),
}));

jest.mock('../services/api', () => ({
    documentAPI: {
        getDocument: jest.fn(),
        updateDocument: jest.fn()
    },
    aiAPI: {
        stream: jest.fn()
    }
}));

// Mock Yjs provider
jest.mock('y-websocket', () => {
    return {
        WebsocketProvider: jest.fn().mockImplementation(() => ({
            destroy: jest.fn(),
            on: jest.fn(),
            awareness: {
                setLocalStateField: jest.fn(),
                getStates: jest.fn().mockReturnValue(new Map()),
                on: jest.fn()
            }
        }))
    };
});

// Mock Quill
jest.mock('react-quill', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: React.forwardRef((props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                getEditor: () => ({
                    getText: () => 'text',
                    getLength: () => 4,
                    root: { innerHTML: '<p>content</p>' },
                    on: jest.fn(),
                    off: jest.fn(),
                    setContents: jest.fn(),
                    clipboard: {
                        convert: jest.fn().mockReturnValue({})
                    }
                })
            }));
            return <div data-testid="quill-editor" />;
        })
    };
});

// Mock y-quill
jest.mock('y-quill', () => ({
    QuillBinding: jest.fn()
}));

test('renders editor with document title', async () => {
    (documentAPI.getDocument as jest.Mock).mockResolvedValue({
        data: {
            document: {
                _id: '123',
                title: 'Test Doc',
                content: '<p>Test content</p>',
                lastSaved: new Date().toISOString()
            }
        }
    });

    render(
        <BrowserRouter>
            <Editor user={{ id: '123', name: 'Test User' }} onLogout={() => { }} />
        </BrowserRouter>
    );

    // Initially shows loader
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Eventually loads and shows title
    await waitFor(() => {
        expect(screen.getByPlaceholderText('Untitled Document')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Test Doc')).toBeInTheDocument();
});
