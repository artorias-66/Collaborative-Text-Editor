import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#0f172a', // Deep blue/black
            paper: 'rgba(30, 41, 59, 0.7)', // Translucent dark
        },
        primary: {
            main: '#6366f1', // Indigo
            light: '#818cf8',
            dark: '#4f46e5',
        },
        secondary: {
            main: '#ec4899', // Pink
            light: '#f472b6',
            dark: '#db2777',
        },
        text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
            fontSize: '3.5rem',
            letterSpacing: '-0.02em',
        },
        h2: {
            fontWeight: 700,
            fontSize: '2.5rem',
            letterSpacing: '-0.01em',
        },
        h3: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '12px',
                    padding: '10px 24px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                },
                containedSecondary: {
                    background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        '& fieldset': {
                            borderColor: 'rgba(148, 163, 184, 0.2)',
                        },
                        '&:hover fieldset': {
                            borderColor: '#6366f1',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#6366f1',
                        },
                    },
                },
            },
        },
    },
});

export default theme;
