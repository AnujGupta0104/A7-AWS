const { body, validationResult } = require('express-validator');

const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  };
};

const authValidations = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty()
];

const cropValidations = [
  body('cropName').trim().notEmpty(),
  body('area').isFloat({ min: 0 }),
  body('sowingDate').isISO8601()
];

const procurementValidations = [
  body('cropType').trim().notEmpty(),
  body('quantity').isFloat({ min: 0 }),
  body('pricePerUnit').isFloat({ min: 0 }),
  body('deadline').isISO8601()
];

module.exports = {
  validateRequest,
  authValidations,
  cropValidations,
  procurementValidations
};
