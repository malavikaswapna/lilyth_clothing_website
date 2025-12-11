// middleware/addressValidator.js
const pincodeService = require("../utils/pincodeService");

//validate Kerala addresses only
const validateKeralaAddress = async (req, res, next) => {
  try {
    const address =
      req.body.shippingAddress ||
      req.body.billingAddress ||
      req.body.address ||
      req.body;

    if (!address || !address.postalCode) {
      return next();
    }

    //block non-Kerala addresses immediately
    if (address.state && address.state.toLowerCase() !== "kerala") {
      return res.status(400).json({
        success: false,
        message:
          "We currently only deliver within Kerala state. Please provide a Kerala address.",
        isOutsideServiceArea: true,
      });
    }

    //block non-India addresses
    if (address.country && address.country.toLowerCase() !== "india") {
      return res.status(400).json({
        success: false,
        message: "We currently only deliver within India.",
        isOutsideServiceArea: true,
      });
    }

    // validate Kerala PIN code
    const pincodeResult = await pincodeService.validatePincode(
      address.postalCode
    );

    if (pincodeResult.isValid === false) {
      return res.status(400).json({
        success: false,
        message: pincodeResult.message,
        isOutsideServiceArea: pincodeResult.isOutsideServiceArea || false,
      });
    }

    // if API is down, log warning but allow through
    if (pincodeResult.isValid === null) {
      console.warn(
        "⚠️ PIN code validation service unavailable - allowing request"
      );
      return next();
    }

    // auto-correct/fill Kerala address data
    if (pincodeResult.data) {
      const suggestedCity = pincodeResult.data.district;

      // check city match
      if (
        address.city &&
        address.city.toLowerCase() !== suggestedCity.toLowerCase()
      ) {
        console.warn(
          `⚠️ City mismatch for Kerala PIN: User entered "${address.city}", ` +
            `should be "${suggestedCity}"`
        );

        req.addressSuggestions = {
          city: suggestedCity,
          state: "Kerala",
          userProvidedCity: address.city,
        };
      }

      // auto-fill Kerala address
      address.state = "Kerala";
      address.country = "India";

      req.validatedPincodeData = pincodeResult.data;
    }

    next();
  } catch (error) {
    console.error("Kerala address validation error:", error);
    next();
  }
};

// strict validation for Kerala delivery addresses (orders)
const strictValidateKeralaAddress = async (req, res, next) => {
  try {
    const address =
      req.body.shippingAddress ||
      req.body.billingAddress ||
      req.body.address ||
      req.body;

    if (!address || !address.postalCode) {
      return res.status(400).json({
        success: false,
        message: "Postal code is required",
      });
    }

    // must be Kerala
    if (address.state && address.state.toLowerCase() !== "kerala") {
      return res.status(400).json({
        success: false,
        message: "Sorry, we currently deliver only within Kerala state.",
        isOutsideServiceArea: true,
      });
    }

    // must be India
    if (address.country && address.country.toLowerCase() !== "india") {
      return res.status(400).json({
        success: false,
        message: "We currently only deliver within India.",
        isOutsideServiceArea: true,
      });
    }

    const pincodeResult = await pincodeService.validatePincode(
      address.postalCode
    );

    // block if invalid
    if (pincodeResult.isValid === false) {
      return res.status(400).json({
        success: false,
        message: pincodeResult.message,
        isOutsideServiceArea: pincodeResult.isOutsideServiceArea || false,
      });
    }

    // block if API is down (for orders)
    if (pincodeResult.isValid === null) {
      return res.status(503).json({
        success: false,
        message:
          "PIN code verification service temporarily unavailable. Please try again in a moment.",
      });
    }

    // verify city matches
    if (address.city) {
      const verifyResult = await pincodeService.verifyAddress(
        address.postalCode,
        address.city,
        "Kerala"
      );

      if (verifyResult.isValid === false) {
        if (verifyResult.isOutsideServiceArea) {
          return res.status(400).json({
            success: false,
            message: verifyResult.message,
            isOutsideServiceArea: true,
          });
        }

        if (verifyResult.suggestions) {
          return res.status(400).json({
            success: false,
            message: "City/District does not match PIN code",
            suggestions: verifyResult.suggestions,
          });
        }
      }
    }

    // auto-set Kerala and India
    address.state = "Kerala";
    address.country = "India";

    req.validatedPincodeData = pincodeResult.data;
    next();
  } catch (error) {
    console.error("Strict Kerala address validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Error validating address",
    });
  }
};

module.exports = {
  validateKeralaAddress,
  strictValidateKeralaAddress,
};
