// Function to check the availability of the Gemini Nano model
const checkModelAvailability = async () => {
  try {
    const { available } = await ai.languageModel.capabilities();
    if (available === "readily") {
      console.log("Gemini Nano model is readily available.");
    } else {
      console.error("Gemini Nano model is not readily available.");
    }
    return available === "readily";
  } catch (error) {
    console.error("Error checking model availability:", error);
    return false;
  }
};

// Function to initialize a new session for the Gemini Nano model
const initializeSession = async () => {
  try {
    const isAvailable = await checkModelAvailability();
    if (isAvailable) {
      const session = await ai.languageModel.create();
      console.log("Gemini Nano session object:", session); // Log the entire session object
      console.log("Session ID:", session?.id || "Session ID is missing"); // Explicit logging for ID
      return session;
    } else {
      console.error("Failed to create Gemini Nano session. Model is not available.");
      return null;
    }
  } catch (error) {
    console.error("Error initializing Gemini Nano session:", error);
    return null;
  }
};

// Persistent session variable
let nanoSession = null;

// Initialize session when the extension is installed or reloaded

// Write session ID to storage after initialization
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed or reloaded. Initializing Nano session...");
  nanoSession = await initializeSession();
  console.log("Extension installed or reloaded: AFTER Initializing Nano session...");
  if (nanoSession) {
    const sessionId = nanoSession.id || "Fallback Session ID";
    chrome.storage.local.set({ sessionId }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error storing session ID:", chrome.runtime.lastError.message);
      } else {
        console.log("Session ID successfully stored:", sessionId);
      }
    });
    console.log("Nano model session successfully initialized. Session ID:", sessionId);
  } else {
    console.log("Nano model session could not be initialized at install.");
  }
});





// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  switch (request.action) {
    case "refreshCartData":
      console.log("Refreshing cart data...");
      refreshCartData(sendResponse);
      return true; // Keep the message channel open for async response

    
    case "updateCart":
      console.log("Received updateCart action with payload:", request.cartItems);
      if (request.cartItems && request.cartItems.length > 0) {
        chrome.storage.local.set({ cartItems: request.cartItems }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error storing cart items:", chrome.runtime.lastError.message);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log("Cart items successfully stored:", request.cartItems);
            sendResponse({ success: true });
          }
        });
      } else {
        console.error("No cart items provided in updateCart action.");
        sendResponse({ success: false, error: "Cart items are missing." });
      }
      return true; // Keep the message channel open for asynchronous response
      

    case "getInsights":
        console.log("Received request to generate insights:", request);

        if (!nanoSession) {
          console.warn("Nano session not initialized. Attempting to create a new session...");
          nanoSession = await initializeSession();
          if (!nanoSession) {
            sendResponse({ error: "Gemini Nano model unavailable." });
            return true; // Exit if session initialization fails
          }
        }

        // Fetch cart items from storage and include in the prompt
        const getCartItems = async () => {
          return new Promise((resolve) => {
            chrome.storage.local.get("cartItems", (data) => {
              resolve(data.cartItems || []);
            });
          });
        };

        // Use in prompt
        //const cartItems = await getCartItems();
        //const formattedCartItems = cartItems
         // .map((item, index) => `${index + 1}. ${item.name} (${item.price || "Price not available"})`)
          //.join("\n");

        //console.log("Cart items for generating insights:", cartItems);
        const formattedCartItems = ""

        try {
          const promptText_old = `
            Budget: $${request.budget}
            Preferences: ${JSON.stringify(request.preferences)}
            Cart Items:
            ${formattedCartItems || "No items in the cart."}
            Please provide:
            1. A budget recommendation
            2. Product suggestions
            3. Holiday-specific recommendations
            4. Gift suggestions
          `;
          const promptText = `
            Budget: $${request.budget}
            Preferences: ${JSON.stringify(request.preferences)}
            Cart Items: 
            Please provide:
            1. Product suggestions
          `;
          console.log("Sending prompt to Gemini Nano model:", promptText);

          // Generate insights asynchronously
          const response = await nanoSession.prompt(promptText);
          console.log("Response from Gemini Nano model:", response);

          // Store response for later access
          chrome.storage.local.set({ insightsResponse: response }, () => {
            if (chrome.runtime.lastError) {
              console.error("Error storing insights:", chrome.runtime.lastError.message);
            } else {
              console.log("Insights successfully stored.");
            }
          });

            // Parse insights
            const insights = parseInsights(response);
            sendResponse({ insights }); // Send response back to popup.js

          } catch (error) {
              console.error("Error generating insights:", error);
              sendResponse({ error: error.message });
          }

          return true; // Keep the port open for async response

      default:
        console.warn("Unknown action received:", request.action);
        sendResponse({ error: "Unknown action" });
        break;

          }
        });

// Function to refresh cart data by querying the content script
const refreshCartData = (sendResponse) => {
  chrome.tabs.query({ url: "*://www.amazon.com/gp/cart/view.html*" }, (tabs) => {
    console.log("Tabs queried for cart page:", tabs);

    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      console.log(`Found cart page tab with ID: ${tabId}. Sending message to content script...`);

      chrome.tabs.sendMessage(tabId, { action: "fetchCartData" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error in sending message to content script:", chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else if (response && response.success) {
          console.log("Cart data refreshed successfully:", response.cartItems);
          chrome.storage.local.set({ cartItems: response.cartItems }, () => {
            console.log("Cart data stored locally.");
          });
          sendResponse({ success: true });
        } else {
          console.warn("Failed to refresh cart data. No response from content script.");
          sendResponse({ success: false, error: "No response from content script." });
        }
      });
    } else {
      console.warn("No Amazon cart page tab found.");
      sendResponse({ success: false, error: "No cart page tab found." });
    }
  });
};



// Function to parse insights from the Gemini Nano response

const parseInsights_old = (text) => {
  console.log("Parsing insights from response text...");
  
  // Log the full response text for debugging
  console.log("Full response text:", text);
  
  // Use regex or specific markers to locate sections in the text
  const insights = {
    budgetRecommendation: "N/A",
    productSuggestion: "N/A",
    holidayRecommendation: "N/A",
    giftSuggestion: "N/A",
  };

  // Define patterns for each insight
  const patterns = {
    budgetRecommendation: /Budget Recommendation:(.*?)(?:\n|$)/i,
    productSuggestion: /Product Suggestions:(.*?)(?:\n|$)/i,
    holidayRecommendation: /Holiday-Specific Recommendations:(.*?)(?:\n|$)/i,
    giftSuggestion: /Gift Suggestions:(.*?)(?:\n|$)/i,
  };

  // Extract insights based on the patterns
  for (const [key, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match && match[1]) {
      insights[key] = match[1].trim();
    }
  }

  console.log("Parsed insights:", insights);
  return insights;
};


const parseInsights = (responseText) => {
  console.log("Parsing insights from response text:", responseText);

  // Split response into lines and match key sections
  const lines = responseText.split("\n");

  const budgetRecommendation = lines.find(line => line.includes("Budget recommendation"))?.split(":")[1]?.trim() || "N/A";
  const productSuggestion = lines.find(line => line.includes("Product suggestions"))?.split(":")[1]?.trim() || "N/A";
  const holidayRecommendation = lines.find(line => line.includes("Holiday-specific recommendations"))?.split(":")[1]?.trim() || "N/A";
  const giftSuggestion = lines.find(line => line.includes("Gift suggestions"))?.split(":")[1]?.trim() || "N/A";

  return {
    budgetRecommendation,
    productSuggestion,
    holidayRecommendation,
    giftSuggestion,
  };
};
