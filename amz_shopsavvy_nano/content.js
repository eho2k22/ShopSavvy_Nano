(function () {
  if (typeof window.AMZpageStartTime === 'undefined') {
    window.AMZpageStartTime = Date.now();
    let isLoggedIn = false;

    console.log("Amazon Shopping Nano: Nano Content JS loaded on this page:", window.location.href);

    // Check if the user is on the Cart page
    const checkForCartPage = () => {
      if (window.location.href.includes('/gp/cart/view.html')) {
        console.log("User is on the cart page. Waiting for elements to load...");
        setTimeout(() => {
          console.log("Attempting to fetch cart data...");
          fetchCartData();
        }, 3000); // Delay of 2 seconds to allow dynamic content to load

      } else {
        console.log("User is NOT on the Cart Page.");
      }
    };
    

    // Check if the user is on the Order History page
    const checkForOrderHistoryPage = () => {
      if (window.location.href.includes('/order-history') || window.location.href.includes('/gp/css/order-history')) {
        console.log("User is on the Order History page. Fetching order history data...");
        fetchOrderHistory();
      }
    };

    checkForCartPage();
    checkForOrderHistoryPage();

    // Event listeners for URL changes
    window.addEventListener('popstate', () => {
      checkForCartPage();
      checkForOrderHistoryPage();
    });

    window.addEventListener('pushstate', () => {
      checkForCartPage();
      checkForOrderHistoryPage();
    });

    function sendCartUpdate(cartItems) {
     try {
        chrome.runtime.sendMessage(
          {
            action: "updateCart",
            cartItems: cartItems,
            isLoggedIn: checkLoginStatus(),
            sessionId: getNanoSessionId()
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending message to background:", chrome.runtime.lastError.message);
            } else if (response && response.success) {
              console.log("Cart update successful:", response);
            } else {
              console.error("Failed to update cart:", response?.error || "Unknown error");
            }
          }
        );
      } catch (error) {
        console.error("Unexpected error during sendCartUpdate:", error);
      }

    }
    

    function fetchCartData() {
      console.log("Fetching cart data...");
      const cartItems = [];
    
      document.querySelectorAll('.sc-list-item-content').forEach((item) => {
        const itemName = item.querySelector('.sc-product-title')?.textContent?.trim();
        const itemPrice = item.querySelector('.sc-price, .a-price-whole')?.textContent?.trim();
    
        console.log("Cart item found:", itemName, itemPrice);
    
        if (itemName) {
          cartItems.push({ name: itemName, price: itemPrice });
        }
      });
    
      if (cartItems.length === 0) {
        console.error("No cart items found!");
        return; // Exit early if no cart items are detected
      }
    
      console.log("Cart items ready to send:", cartItems);
    
      // Use the new `sendCartUpdate` function
      sendCartUpdate(cartItems);
    }
    
    
    
    // Function to fetch order history
    function fetchOrderHistory() {
      const orders = [];
      document.querySelectorAll('.order-item-selector').forEach(orderItem => {
        const title = orderItem.querySelector('.title-selector')?.textContent.trim();
        const price = orderItem.querySelector('.price-selector')?.textContent.trim();

        if (title && price) {
          orders.push({ title, price });
        }
      });

      if (orders.length > 0) {
        console.log("Order history data:", orders);
        chrome.runtime.sendMessage({
          action: "storeOrderHistory",
          orders: orders,
          isLoggedIn: checkLoginStatus(),
          sessionId: getNanoSessionId() // Ensure you get the session ID for Nano API
        });
      }

      if (orders.length === 0) {
        console.log("Order history data is EMPTY !!");
      }
    }

    // Function to get the user's session ID for Nano
    function getNanoSessionId() {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get("sessionId", (data) => {
          if (chrome.runtime.lastError) {
            console.error("Error retrieving session ID:", chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError.message);
          } else if (data.sessionId) {
            console.log("Session ID retrieved:", data.sessionId);
            resolve(data.sessionId);
          } else {
            console.log("Session ID not found. Creating new session...");
            console.log("Resolving with fallback session ID...");
            resolve("Fallback Session ID"); // Resolve with a fallback session ID
            //createNanoSession()
              //.then(resolve)
              //.catch((error) => {
                //console.error("Error creating Nano session in getNanoSessionId:", error);
                //console.warn("Resolving with fallback session ID...");
                //resolve("Fallback Session ID"); // Resolve with a fallback session ID
                //reject(error);
              //});
          }
        });
      });
    }
      

    // Function to create a new session for Nano if it doesn't exist
    function createNanoSession() {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "createNanoSession" }, (response) => {
          if (response?.sessionId) {
            chrome.storage.local.set({ sessionId: response.sessionId }, () => {
              console.log("Nano session created and saved:", response.sessionId);
              resolve(response.sessionId);
            });
          } else {
            console.error("Error creating Nano session:", response?.error || "No sessionId returned");
            reject(new Error(response?.error || "Failed to create Nano session"));
          }
        });
      });
    }
    
    

    // Function to get the user's login status
    function checkLoginStatus() {
      const accountElement = document.querySelector('#nav-link-accountList-nav-line-1');
      isLoggedIn = accountElement && accountElement.textContent.includes('Hello,');
      return isLoggedIn;
    }

    // Fetch user details like username
    function getUserName() {
      const accountElement = document.querySelector('#nav-link-accountList-nav-line-1');
      return accountElement && accountElement.textContent.includes('Hello,')
        ? accountElement.textContent.replace('Hello,', '').trim()
        : null;
    }

    // Send username to storage and background.js
    function checkAndSendUserName() {
      const userName = getUserName();
      if (userName) {
        chrome.storage.local.set({ userName: userName });
        chrome.runtime.sendMessage({ action: 'updateUserName', userName });
      } else {
        console.log("Username not found, using default AMZ Shopper.");
      }
    }

    // Ensure username is fetched on each page load
    window.addEventListener('load', checkAndSendUserName);
    checkAndSendUserName();

    // Initialize tracking for page views and interactions
    function initialize() {
      checkLoginStatus();

      document.addEventListener('click', (event) => {
        if (event.target.id === 'add-to-cart-button') {
          handleAddToCart();
        }
      });

      if (window.location.href.includes('/gp/cart/view.html')) {
        fetchCartData();
      }

      if (window.location.pathname.includes('/gp/buy/thankyou')) {
        handlePurchase();
      }
    }

    // Track page view when a product is viewed
    function trackPageView() {
      const productId = getProductId();
      if (productId) {
        const timeSpent = (Date.now() - window.AMZpageStartTime) / 1000;
        const category = getCategory();
        chrome.runtime.sendMessage({
          action: "updateProductView",
          productId: productId,
          timeSpent: timeSpent,
          isLoggedIn: isLoggedIn,
          category: category
        });
      }
    }

    // Handle add to cart event
    function handleAddToCart() {
      const item = getProductDetails();
      if (isLoggedIn) {
        const cartItems = getCartContents();
        chrome.runtime.sendMessage({
          action: "updateCart",
          item: item,
          cartItems: cartItems,
          isLoggedIn: true
        });
      } else {
        chrome.runtime.sendMessage({
          action: "trackAddToCartAttempt",
          item: item,
          isLoggedIn: false
        });
      }
    }

    // Handle purchase event
    function handlePurchase() {
      if (isLoggedIn) {
        const purchasedItems = getCartContents();
        chrome.runtime.sendMessage({
          action: "recordPurchase",
          items: purchasedItems,
          isLoggedIn: true
        });
      } else {
        chrome.runtime.sendMessage({
          action: "trackPurchaseAttempt",
          isLoggedIn: false
        });
      }
    }

    // Initialize and handle page interactions
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "trackPageView") {
        trackPageView();
      }
    });

    initialize();
  } else {
    console.log("Content script already loaded once on this page.");
  }
})();





