// utils/pincodeService.js
const axios = require("axios");

const PINCODE_API_BASE = "https://api.postalpincode.in";

// Kerala PIN code ranges
const KERALA_PINCODE_RANGES = [
  { start: 670000, end: 695999 },
  { start: 686000, end: 686999 },
];

class PincodeService {
  //Check if PIN code is in Kerala range

  isKeralaPincode(pincode) {
    const pincodeNum = parseInt(pincode);

    return KERALA_PINCODE_RANGES.some(
      (range) => pincodeNum >= range.start && pincodeNum <= range.end
    );
  }

  // Validate and get details for a Kerala PIN code
  async validatePincode(pincode) {
    try {
      if (!pincode || !/^\d{6}$/.test(pincode.toString())) {
        return {
          isValid: false,
          message: "PIN code must be 6 digits",
          data: null,
        };
      }

      if (!this.isKeralaPincode(pincode)) {
        return {
          isValid: false,
          message:
            "We currently only deliver within Kerala. Please enter a Kerala PIN code.",
          data: null,
          isOutsideServiceArea: true,
        };
      }

      const response = await axios.get(
        `${PINCODE_API_BASE}/pincode/${pincode}`,
        { timeout: 5000 }
      );

      const result = response.data[0];

      if (result.Status === "Success" && result.PostOffice) {
        const postOffice = result.PostOffice[0];

        if (postOffice.State !== "Kerala") {
          return {
            isValid: false,
            message: `Sorry, we currently only deliver within Kerala. This PIN code is in ${postOffice.State}.`,
            data: null,
            isOutsideServiceArea: true,
          };
        }

        return {
          isValid: true,
          message: result.Message,
          data: {
            pincode: pincode,
            postOffices: result.PostOffice.map((po) => ({
              name: po.Name,
              branchType: po.BranchType,
              deliveryStatus: po.DeliveryStatus,
              circle: po.Circle,
              district: po.District,
              division: po.Division,
              region: po.Region,
              state: po.State,
              country: po.Country,
            })),
            // Primary details from first post office
            district: postOffice.District,
            state: postOffice.State,
            country: postOffice.Country,
            region: postOffice.Region,
          },
        };
      }

      return {
        isValid: false,
        message: result.Message || "Invalid PIN code",
        data: null,
      };
    } catch (error) {
      console.error("PIN code validation error:", error.message);

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return {
          isValid: null,
          message: "PIN code verification service temporarily unavailable",
          data: null,
        };
      }

      return {
        isValid: false,
        message: "Error validating PIN code",
        data: null,
      };
    }
  }

  // Search Kerala post offices only
  async searchPostOffice(query) {
    try {
      if (!query || query.trim().length < 3) {
        return {
          success: false,
          message: "Search query must be at least 3 characters",
          data: [],
        };
      }

      const response = await axios.get(
        `${PINCODE_API_BASE}/postoffice/${encodeURIComponent(query)}`,
        { timeout: 5000 }
      );

      const result = response.data[0];

      if (result.Status === "Success" && result.PostOffice) {
        const keralaPostOffices = result.PostOffice.filter(
          (po) => po.State === "Kerala"
        );

        if (keralaPostOffices.length === 0) {
          return {
            success: false,
            message: "No post offices found in Kerala matching your search",
            data: [],
          };
        }

        return {
          success: true,
          message: `Found ${keralaPostOffices.length} post office(s) in Kerala`,
          data: keralaPostOffices.map((po) => ({
            name: po.Name,
            pincode: po.PINCode,
            branchType: po.BranchType,
            deliveryStatus: po.DeliveryStatus,
            district: po.District,
            state: po.State,
            region: po.Region,
            country: po.Country,
          })),
        };
      }

      return {
        success: false,
        message: result.Message || "No post offices found",
        data: [],
      };
    } catch (error) {
      console.error("Post office search error:", error.message);
      return {
        success: false,
        message: "Error searching post office",
        data: [],
      };
    }
  }

  //Get Kerala district suggestions
  async getDistrictSuggestions(query) {
    try {
      const result = await this.searchPostOffice(query);

      if (result.success) {
        const districts = new Set();
        result.data.forEach((po) => {
          if (po.district) districts.add(po.district);
        });

        return {
          success: true,
          suggestions: Array.from(districts).slice(0, 10),
        };
      }

      return {
        success: false,
        suggestions: [],
      };
    } catch (error) {
      console.error("District suggestions error:", error.message);
      return {
        success: false,
        suggestions: [],
      };
    }
  }

  //Get all Kerala districts
  getKeralaDistricts() {
    return [
      "Alappuzha",
      "Ernakulam",
      "Idukki",
      "Kannur",
      "Kasaragod",
      "Kollam",
      "Kottayam",
      "Kozhikode",
      "Malappuram",
      "Palakkad",
      "Pathanamthitta",
      "Thiruvananthapuram",
      "Thrissur",
      "Wayanad",
    ];
  }

  //Verify if address is within Kerala
  async verifyAddress(pincode, city, state) {
    try {
      if (state && state.toLowerCase() !== "kerala") {
        return {
          isValid: false,
          message: "We currently only deliver within Kerala state",
          suggestions: null,
          isOutsideServiceArea: true,
        };
      }

      const pincodeData = await this.validatePincode(pincode);

      if (!pincodeData.isValid) {
        return {
          isValid: false,
          message: pincodeData.message,
          suggestions: null,
          isOutsideServiceArea: pincodeData.isOutsideServiceArea || false,
        };
      }

      const data = pincodeData.data;

      // Verify Kerala
      if (data.state !== "Kerala") {
        return {
          isValid: false,
          message: "We currently only deliver within Kerala",
          suggestions: null,
          isOutsideServiceArea: true,
        };
      }

      // Case-insensitive comparison for city/district
      const cityMatch =
        city && data.district.toLowerCase().includes(city.toLowerCase());

      if (!cityMatch && city) {
        return {
          isValid: false,
          message: "City/District does not match PIN code",
          suggestions: {
            correctCity: data.district,
            correctState: data.state,
            correctCountry: data.country,
          },
        };
      }

      return {
        isValid: true,
        message: "Address verified successfully",
        data: data,
      };
    } catch (error) {
      console.error("Address verification error:", error.message);
      return {
        isValid: null,
        message: "Could not verify address",
        suggestions: null,
      };
    }
  }

  //Get delivery information for a Kerala PIN code
  async getDeliveryInfo(pincode) {
    try {
      const pincodeData = await this.validatePincode(pincode);

      if (!pincodeData.isValid) {
        return {
          canDeliver: false,
          message: pincodeData.message,
          estimatedDays: null,
        };
      }

      // Determine delivery time based on district
      const data = pincodeData.data;
      let estimatedDays = 3;

      const majorCities = [
        "Ernakulam",
        "Thiruvananthapuram",
        "Kozhikode",
        "Thrissur",
      ];
      if (majorCities.includes(data.district)) {
        estimatedDays = 2;
      }

      const remoteCities = ["Wayanad", "Idukki", "Kasaragod"];
      if (remoteCities.includes(data.district)) {
        estimatedDays = 4;
      }

      return {
        canDeliver: true,
        message: `We deliver to ${data.district}`,
        estimatedDays: estimatedDays,
        district: data.district,
        deliveryCharge: this.calculateDeliveryCharge(data.district),
      };
    } catch (error) {
      console.error("Delivery info error:", error.message);
      return {
        canDeliver: null,
        message: "Could not determine delivery availability",
        estimatedDays: null,
      };
    }
  }

  //Calculate delivery charge based on district
  calculateDeliveryCharge(district) {
    const freeCities = ["Ernakulam", "Thiruvananthapuram", "Kozhikode"];
    if (freeCities.includes(district)) {
      return 0;
    }

    const remoteCities = ["Wayanad", "Idukki", "Kasaragod"];
    if (remoteCities.includes(district)) {
      return 100;
    }

    return 50;
  }
}

module.exports = new PincodeService();
