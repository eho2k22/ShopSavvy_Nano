// Queue system for managreng API requests
class ApiQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(request, callback) {
    this.queue.push({ request, callback });
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { request, callback } = this.queue.shift();

    try {
      // Process the request with retries
      const response = await processRequestWithRetry(request);
      callback(response);
    } catch (error) {
      console.error("Error in API request after retries:", error);
      callback({ error: error.message });
    } finally {
      this.isProcessing = false;
      this.processQueue(); // Process the next item in the queue
    }
  }
}

// Initialize the queue
const apiQueue = new ApiQueue();

// Persistent session variable
let nanoSession = null;

// Function to ensure the Nano session is available
async function ensureSession() {
  if (!nanoSession) {
    console.warn("Nano session unavailable. Reinitializing...");
    nanoSession = await initializeSession();
    if (!nanoSession) {
      throw new Error("Failed to initialize Gemini Nano session.");
    }
  }
}

// Function to initialize a new session for the Gemini Nano model
async function initializeSession() {
  try {
    const isAvailable = await checkModelAvailability();
    if (isAvailable) {
      const session = await ai.languageModel.create();
      console.log("Gemini Nano session object:", session);
      //console.log("Session ID:", session?.id || "Session ID is missing");
      const sessionId = session.id || "Fallback Session ID";
      console.log("Session ID:", sessionId);

       // Store sessionId in Chrome local storage
       chrome.storage.local.set({ sessionId }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error storing session ID:", chrome.runtime.lastError.message);
        } else {
          console.log("Session ID successfully stored:", sessionId);
        }
      });
      return session;
    } else {
      console.error("Gemini Nano model is not available.");
      return null;
    }
  } catch (error) {
    console.error("Error initializing Gemini Nano session:", error);
    return null;
  }
}

// Function to check the availability of the Gemini Nano model
async function checkModelAvailability() {
  try {
    const { available } = await ai.languageModel.capabilities();
    return available === "readily";
  } catch (error) {
    console.error("Error checking model availability:", error);
    return false;
  }
}

// Function to handle API requests
async function handleApiRequest(request) {
  await ensureSession();

  const cartItems = await getCartItems();
  const formattedCartItems = cartItems
    .map((item, index) => `${index + 1}. ${item.name} (${item.price || "Price not available"})`)
    .join("\n");

  const promptText_old = `
    Budget: $${request.budget}
    Preferences: ${JSON.stringify(request.preferences)}
    Cart Items:
    ${formattedCartItems || "No items in the cart."}
    Based on the given budget and preferences, and with reference to the provided cart items:
    - Make 3-5 Amazon product recommendations, with a sample URL link to the Amazon page if possible. 
    - Provide a brief justification for each recommendation, explaining how it aligns with the user's budget and preferences.
    - Ensure the response is concise, informative, and within 150 words.
    Please ensure the recommendations are practical, realistic, and suitable for the user's stated preferences and budget constraints.
  `;
  
  const promptText = `
    Budget: $${request.budget}
    Preferences: ${JSON.stringify(request.preferences)}
    Based on the given budget and preferences, and with reference to the provided cart items:
    - Make 3-5 Amazon product recommendations, with a sample URL link to the Amazon product page if possible. 
    - Provide a brief justification for each recommendation, explaining how it aligns with the user's budget and preferences.
    - Ensure the response is concise, informative, and within 150 words.
    Please ensure the recommendations are practical, realistic, and suitable for the user's stated preferences and budget constraints.
  `;
  

  console.log("Sending prompt to Gemini Nano model:", promptText);

  try {
    const response = await nanoSession.prompt(promptText);
    console.log("Response from Gemini Nano model:", response);
    //return parseInsights(response); -- INSTEAD OF parseInsights,  returning the entire response 
    return response; 
  } catch (error) {
    console.error("Error generating insights:", error);
    throw error;
  }
}

// Retry mechanism for API requests
async function processRequestWithRetry(request, maxRetries = 5, delayMs = 2000) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await handleApiRequest(request); // Attempt the request
    } catch (error) {
      attempts++;
      console.warn(`Retry ${attempts}/${maxRetries} failed:`, error.message);

      if (attempts >= maxRetries) {
        console.error("Max retries reached. Propagating error...");
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs)); // Wait before retrying
    }
  }
}

// Function to fetch cart items from Chrome storage
async function getCartItems() {
  return new Promise((resolve) => {
    chrome.storage.local.get("cartItems", (data) => {
      resolve(data.cartItems || []);
    });
  });
}

// Function to parse insights from the Gemini Nano response
function parseInsights(responseText) {
  console.log("Parsing insights from response text:", responseText);

  const lines = responseText.split("\n");
  const budgetRecommendation = lines.find((line) => line.includes("Budget recommendation"))?.split(":")[1]?.trim() || "N/A";
  const productSuggestion = lines.find((line) => line.includes("Product suggestions"))?.split(":")[1]?.trim() || "N/A";
  const holidayRecommendation = lines.find((line) => line.includes("Holiday-specific recommendations"))?.split(":")[1]?.trim() || "N/A";
  const giftSuggestion = lines.find((line) => line.includes("Gift suggestions"))?.split(":")[1]?.trim() || "N/A";

  return {
    budgetRecommendation,
    productSuggestion,
    holidayRecommendation,
    giftSuggestion,
  };
}

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "refreshCartData":
      refreshCartData(sendResponse);
      return true; // Keep the port open for async response

    case "updateCart":
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
        sendResponse({ success: false, error: "Cart items are missing." });
      }
      return true;

    case "getInsights":
      apiQueue.enqueue(request, (response) => {
        sendResponse(response);
      });
      return true; // Keep the port open for async response

    default:
      sendResponse({ error: "Unknown action" });
      break;
  }
});

// Function to refresh cart data by querying the content script
function refreshCartData(sendResponse) {
  chrome.tabs.query({ url: "*://www.amazon.com/gp/cart/view.html*" }, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: "fetchCartData" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          sendResponse({ success: false, error: "Failed to refresh cart data." });
        } else {
          chrome.storage.local.set({ cartItems: response.cartItems }, () => {
            sendResponse({ success: true });
          });
        }
      });
    } else {
      sendResponse({ success: false, error: "No cart page tab found." });
    }
  });
}
