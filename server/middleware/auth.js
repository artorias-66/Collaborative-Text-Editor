const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    // Check for token in cookies first, then Authorization header
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { authMiddleware, generateToken };


