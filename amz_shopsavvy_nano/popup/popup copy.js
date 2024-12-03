document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chat-container");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");

  if (!chatContainer || !userInput || !sendButton) {
    console.error("Critical UI elements are missing!");
    return;
  }

  let budget = null;
  let preferences = {
    preferredCategories: [],
    holidaySeason: null,
    giftShopping: null,
  };
  let step = 0; // Track the current step of the conversation
  let userName = "AMZ Shopper"; // Default name in case userName is not captured
  let sessionStarted = false;

  // Load session data and user name
  chrome.storage.local.get(
    ["userName", "budget", "preferences", "step", "sessionStarted"],
    (data) => {
      userName = data.userName || "AMZ Shopper";
      sessionStarted = data.sessionStarted || false;
      budget = data.budget || null;
      preferences = data.preferences || preferences;
      step = data.step || 0;

      if (!sessionStarted) {
        chrome.storage.local.set({ sessionStarted: true });
        greetUser();
      } else if (budget) {
        addMessage("bot", `Welcome back, ${userName}! Your current budget is $${budget}.`);
        askToUpdateBudget();
      } else {
        greetUser();
      }
    }
  );

  // Greet user
  function greetUser() {
    addMessage("bot", `Hey ${userName}! To get started, please first click the top-right Cart icon so we get familiar with your browsing habits, then enter your current budget.`);
  }

  function askToUpdateBudget() {
    addMessage("bot", "Would you like to update your budget? Type 'yes' to update or 'no' to continue with the current budget.");
    step = -1;
  }

  function askToUpdateCategories() {
    addMessage("bot", "Would you like to update your preferred categories? Type 'yes' to update or 'no' to continue with the current settings.");
    step = -2;
  }

  // Add messages to the chat container
  function addMessage(sender, message, isHTML = false) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${sender}`;
    messageElement[isHTML ? "innerHTML" : "textContent"] = message;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Event listeners for user input
  sendButton.addEventListener("click", handleUserInput);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserInput();
  });

  function handleUserInput() {
    const userMessage = userInput ? userInput.value.trim().toLowerCase() : "";
    if (!userMessage) {
      console.warn("Empty input. Ignoring.");
      return;
    }

    addMessage("user", userMessage);
    userInput.value = "";

    // Simplified switch-case for handling user input
    switch (step) {
      case -1:
        handleBudgetUpdate(userMessage);
        break;
      case -2:
        handleCategoryUpdate(userMessage);
        break;
      case 0:
        handleBudgetEntry(userMessage);
        break;
      case 1:
        handleCategoryEntry(userMessage);
        break;
      case 2:
        handleHolidayShopping(userMessage);
        break;
      case 3:
        handleGiftShopping(userMessage);
        break;
      case 5:
        handleRestart(userMessage);
        break;
      default:
        addMessage("bot", "Sorry, I didn't understand that.");
    }
  }

  function handleBudgetUpdate(message) {
    if (message === "yes") {
      resetPreferences();
      addMessage("bot", "Let's start over. Please enter your new budget:");
      step = 0;
    } else if (message === "no") {
      addMessage("bot", "Great! Continuing with the current budget.");
      askToUpdateCategories();
    } else {
      addMessage("bot", "Please type 'yes' to update or 'no' to continue.");
    }
  }

  function handleCategoryUpdate(message) {
    if (message === "yes") {
      addMessage("bot", "Please enter your preferred categories (you can enter multiple categories separated by commas):");
      step = 1;
    } else if (message === "no") {
      addMessage("bot", "Great! Continuing with the current categories.");
      continueConversation();
    } else {
      addMessage("bot", "Please type 'yes' to update or 'no' to continue.");
    }
  }

  function handleBudgetEntry(message) {
    const parsedBudget = parseFloat(message);
    if (!isNaN(parsedBudget) && parsedBudget > 0) {
      budget = parsedBudget;
      chrome.storage.local.set({ budget });
      addMessage("bot", `I've set your shopping budget to $${budget.toFixed(2)}.`);
      step = 1;
      askForCategories();
    } else {
      addMessage("bot", "Please enter a valid budget.");
    }
  }

  function handleCategoryEntry(message) {
    const categories = message.split(",").map((c) => c.trim());
    if (categories.length > 0) {
      preferences.preferredCategories = categories;
      chrome.storage.local.set({ preferences });
      addMessage("bot", `Categories set to: ${categories.join(", ")}`);
      step = 2;
      askForHoliday();
    } else {
      addMessage("bot", "Please enter one or more categories.");
    }
  }

  function handleHolidayShopping(message) {
    if (message === "yes" || message === "no") {
      preferences.holidaySeason = message === "yes";
      chrome.storage.local.set({ preferences });
      addMessage("bot", `Holiday shopping: ${preferences.holidaySeason ? "Yes" : "No"}`);
      step = 3;
      askForGiftShopping();
    } else {
      addMessage("bot", "Please enter 'yes' or 'no' for holiday shopping.");
    }
  }

  function handleGiftShopping(message) {
    if (message === "yes" || message === "no") {
      preferences.giftShopping = message === "yes";
      chrome.storage.local.set({ preferences });
      addMessage("bot", `Gift shopping: ${preferences.giftShopping ? "Yes" : "No"}`);
      step = 4;
      askForInsights();
    } else {
      addMessage("bot", "Please enter 'yes' or 'no' for gift shopping.");
    }
  }

  function handleRestart(message) {
    if (message === "yes") {
      resetPreferences();
      addMessage("bot", "Let's start over. Please enter your new budget:");
      step = 0;
    } else if (message === "no") {
      addMessage("bot", "Okay, let me know if you need further assistance!");
    } else {
      addMessage("bot", "Please type 'yes' to start a new search or 'no' to end.");
    }
  }

  function resetPreferences() {
    budget = null;
    preferences = {
      preferredCategories: [],
      holidaySeason: null,
      giftShopping: null,
    };
    chrome.storage.local.set({ budget: null, preferences });
    step = 0;
  }

  function continueConversation() {
    if (preferences.preferredCategories.length > 0) {
      askForInsights();
    } else {
      askForCategories();
    }
  }

  function askForCategories() {
    addMessage("bot", "Now, please enter your preferred categories (you can enter multiple categories separated by commas).");
  }

  function askForHoliday() {
    addMessage("bot", "Are you shopping for a holiday? (yes/no)");
  }

  function askForGiftShopping() {
    addMessage("bot", "Are you shopping for a gift? (yes/no)");
  }


  let retryAttempts = 0;
  const maxRetries = 10;
  const retryDelay = 5000; // Delay in milliseconds (2 seconds)

  function retryFetchingInsights(budget, preferences) {
    if (retryAttempts < maxRetries) {
      retryAttempts++;
      console.log(`Retrying to fetch insights... Attempt ${retryAttempts}/${maxRetries}`);
      
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "getInsights", budget, preferences }, (response) => {
          console.log("Response from getInsights (retry):", response);
          
          if (response && response.insights) {
            displayInsights(response.insights);
            console.log(`Insights have been generated and displayed`);
            retryAttempts = 0; // Reset retry attempts on success
          } else if (response && response.error) {
            console.warn(`Retry error: ${response.error}`);
            addMessage('bot', `Response resulted in Error: ${response.error}. Retrying...`);
            retryFetchingInsights(budget, preferences);
          } else if (!response) {
            console.warn("No response received. Retrying...");
            addMessage('bot', "No response received. Retrying...");
            retryFetchingInsights(budget, preferences);
          }
        });
      }, retryDelay);
    } else {
      addMessage('bot', "Sorry, unable to generate insights after multiple attempts.");
      retryAttempts = 0; // Reset retry attempts on failure
    }
  }

  async function retryFetchingInsightsWithBackoff(budget, preferences) {
    const maxRetries = 10; // Maximum number of retries
    let retryAttempts = 0;
    let delay = 2000; // Start delay at 2 seconds
    const backoffFactor = 2; // Double the delay after each retry
  
    // Sequential retry loop
    while (retryAttempts < maxRetries) {
      try {
        console.log(`Retrying to fetch insights... Attempt ${retryAttempts + 1}/${maxRetries}`);
  
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action: "getInsights", budget, preferences }, (response) => {
            if (response && response.insights) resolve(response); // Resolve on success
            else if (response && response.error) reject(response.error); // Reject on error
            else reject("No response received."); // Reject if no response
          });
        });
  
        // Insights received successfully
        console.log("Successful response:", response);
        displayInsights(response.insights);
        return; // Exit the retry loop on success
  
      } catch (error) {
        console.warn(`Attempt ${retryAttempts + 1} failed: ${error}`);
  
        // Check if we've reached the maximum number of retries
        if (retryAttempts + 1 >= maxRetries) {
          addMessage('bot', "Sorry, unable to generate insights after multiple attempts.");
          return;
        }
  
        // Wait for the backoff delay before the next retry
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffFactor; // Increase the delay for the next retry
        retryAttempts++; // Increment retry count
      }
    }
  }
  
  function askForInsights() {
    addMessage('bot', "Refreshing your cart data and generating shopping insights based on your preferences. Please wait...");
  
    chrome.runtime.sendMessage({ action: "refreshCartData" }, (response) => {
      console.log("Response from refreshCartData:", response);
  
      if (response && response.success) {
        console.log("Cart data refreshed successfully. Proceeding to get insights...");
  
        // Use the backoff-enabled retry mechanism for `getInsights`
        retryFetchingInsightsWithBackoff(budget, preferences);
  
      } else {
        console.warn("Failed to refresh cart data. Attempting to retrieve cart items from local storage...");
  
        chrome.storage.local.get("cartItems", (data) => {
          if (data.cartItems && data.cartItems.length > 0) {
            console.log("Using stored cart data:", data.cartItems);
  
            // Use the backoff-enabled retry mechanism for stored cart data
            retryFetchingInsightsWithBackoff(budget, preferences);
  
          } else {
            console.error("No cart items found in local storage.");
            addMessage('bot', "Oops, please click the Cart icon on the top right to refresh, and try again.");
          }
        });
      }
    });
  }
  


  function askForInsights_old() {
    addMessage('bot', "Refreshing your cart data and generating shopping insights based on your preferences. Please wait...");
  
    chrome.runtime.sendMessage({ action: "refreshCartData" }, (response) => {
      console.log("Response from refreshCartData:", response);
  
      if (response && response.success) {
        console.log("Cart data refreshed successfully. Proceeding to get insights...");
        
        // Wrap sendMessage in a timer to enforce a timeout
        let isResponseReceived = false;
        const timeout = 5000; // 5 seconds timeout
  
        // Start the timer
        const timer = setTimeout(() => {
          if (!isResponseReceived) {
            console.warn("Timeout: No response from getInsights within the allowed time.");
            addMessage('bot', "The system is taking too long to respond. Retrying...");
            retryFetchingInsights(budget, preferences);
          }
        }, timeout);
  
        // Make the sendMessage call
        chrome.runtime.sendMessage({ action: "getInsights", budget, preferences }, (response) => {
          isResponseReceived = true; // Response received, clear the timer
          clearTimeout(timer);
  
          console.log("Response from getInsights:", response);
  
          if (response && response.insights) {
            displayInsights(response.insights);
          } else if (response && response.error) {
            addMessage('bot', `Error: ${response.error}. Retrying...`);
            retryFetchingInsights(budget, preferences);
          } else {
            addMessage('bot', "No insights available. Retrying...");
            retryFetchingInsights(budget, preferences);
          }
        });
      } else {
        console.warn("Failed to refresh cart data. Attempting to retrieve cart items from local storage...");
        chrome.storage.local.get("cartItems", (data) => {
          if (data.cartItems && data.cartItems.length > 0) {
            console.log("Using stored cart data:", data.cartItems);
  
            // Wrap sendMessage in a timer for stored cart data
            let isResponseReceived = false;
            const timeout = 5000; // 5 seconds timeout
  
            const timer = setTimeout(() => {
              if (!isResponseReceived) {
                console.warn("Timeout: No response from getInsights with stored cart data.");
                addMessage('bot', "The system is taking too long to respond. Retrying...");
                retryFetchingInsights(budget, preferences);
              }
            }, timeout);
  
            // Make the sendMessage call for stored cart data
            chrome.runtime.sendMessage({ action: "getInsights", budget, preferences }, (response) => {
              isResponseReceived = true; // Response received, clear the timer
              clearTimeout(timer);
  
              console.log("Response from getInsights (using stored cart data):", response);
  
              if (response && response.insights) {
                displayInsights(response.insights);
              } else if (response && response.error) {
                addMessage('bot', `Error: ${response.error}. Retrying...`);
                retryFetchingInsights(budget, preferences);
              } else {
                addMessage('bot', "No insights available. Retrying...");
                retryFetchingInsights(budget, preferences);
              }
            });
          } else {
            console.error("No cart items found in local storage.");
            addMessage('bot', "Oops, please click the Cart icon on the top right to refresh, and try again.");
          }
        });
      }
    });
  }
  

  function displayInsights(insights) {
    console.log("Insights received:", insights);
  
    // Extract only the Product Suggestions
    const productSuggestionHTML = insights.productSuggestion || 'N/A';
  
    // Display Product Suggestions in the chat
    addMessage('bot', `<strong>Product Suggestions:</strong> ${productSuggestionHTML}`, true);
  
    // Provide a follow-up message to continue the conversation
    setTimeout(() => {
      addMessage('bot', "Would you like to perform another search? Type 'yes' or 'no'.");
      step = 5;
    }, 2000);
  }
  

/*
  function displayInsights(insights) {
    const productSuggestionHTML = insights.productSuggestion || "N/A";
    const budgetRecommendationHTML = insights.budgetRecommendation || "N/A";
    const holidayRecommendationHTML = insights.holidayRecommendation || "N/A";
    const giftSuggestionHTML = insights.giftSuggestion || "N/A";

    addMessage("bot", `<strong>Budget Recommendation:</strong> ${budgetRecommendationHTML}`, true);
    addMessage("bot", `<strong>Product Suggestions:</strong> ${productSuggestionHTML}`, true);
    addMessage("bot", `<strong>Holiday Recommendations:</strong> ${holidayRecommendationHTML}`, true);
    addMessage("bot", `<strong>Gift Suggestions:</strong> ${giftSuggestionHTML}`, true);

    setTimeout(() => {
      addMessage("bot", "Would you like to perform another search? Type 'yes' or 'no'.");
      step = 5;
    }, 2000);
  }
  */
});



 

 