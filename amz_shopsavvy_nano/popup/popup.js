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
  //function greetUser() {
    //addMessage("bot", `Hey ${userName}! To get started, please first click the top-right Cart icon so we get familiar with your browsing habits, then enter your current budget.`);
  // }

  function greetUser() {

    // General greeting message
    addMessage(
      "bot",
      `Hey ${userName}! This is ShopSavvy Nano!  Please enter your current budget.`
    );


    if (userName === "AMZ Shopper") {
      addMessage(
        "bot",
        "Looks like I didn't catch your name! Please ensure you are logged in and refresh the current page."
      );
    }
  
    // Check if the user's cart history is empty
    //chrome.storage.local.get("cartItems", (data) => {
      //const cartItems = data.cartItems || [];
     // if (cartItems.length === 0) {
       // addMessage(
         // "bot",
         // "Allow me to learn where you have been shopping lately. Please click the Shopping Cart icon on the top-right."
       // );
      //}
    //});
  
    
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
      case 4:
        askForInsights();
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


  function askForInsights() {
    addMessage("bot", "Refreshing your cart data and generating shopping insights based on your preferences. Please wait...");
    chrome.runtime.sendMessage({ action: "getInsights", budget, preferences }, (response) => {
      console.log("Response from getInsights:", response);

      if (response) {
        console.log("askForInsights(): about to invoke displayInsights now");
        displayInsights(response);
      } else if (response && response.error) {
        addMessage("bot", `Error: ${response.error}`);
      } else {
        addMessage("bot", "No insights available.");
      }
    });
  }

  function displayInsights(insights) {
    console.log("Insights received:", insights);
  
    // Format the response with line breaks
    const formattedResponse = insights
      .split(/(\*\*|\*)/) // Split on ** or * delimiters
      .map((line) => line.trim()) // Trim unnecessary whitespace
      .filter((line) => line.length > 0) // Remove empty lines
      .join("<br>"); // Add line breaks for cleaner formatting
  
    // Add the formatted response to the chat
    addMessage("bot", `<strong>ShopSavvy Nano's Insights:</strong><br>${formattedResponse}`, true);
  
    // Follow-up question
    setTimeout(() => {
      addMessage("bot", "Would you like to perform another search? Type 'yes' or 'no'.");
      step = 5;
    }, 2000);
  }
  
  


  function displayInsights_old(insights) {
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
});
