# ShopSavvy_Nano
a Chrome browser extension designed to enhance your shopping experience on Amazon by utilizing local Gemini Nano-powered recommendations and budget-based insights. 



---


## Overview

Chrome browser extension designed to enhance your shopping experience on Amazon by utilizing local Gemini Nano-powered recommendations and budget-based insights.  It seamlessly integrates with Amazon to provide product suggestions, personalized recommendations, and an interactive chatbot interface for user interaction.

## Features

- **Personalized Recommendations**: Suggests Amazon products tailored to your preferences and shopping habits.
- **Budget Tracking**: Allows users to set and manage shopping budgets effectively.
- **Cart Insights**: Analyzes cart data to generate relevant product suggestions.
- **Interactive Chatbot**: Engages users through a friendly interface to gather preferences and offer insights.
- **AI-Driven**: Powered by Gemini Nano's Prompt API for natural language processing and product recommendations.

## Requirements

To use this extension, ensure the following requirements are met:

1. **Browser**: Google Chrome (Dev or Canary Channel recommended).
2. **Chrome Version**: Version  Chrome Canary 131.0.6776.0 or newer. 
3. **System Requirements**:
   - Windows, macOS (13 Ventura or later), or Linux.
   - At least 22 GB of free storage space.
   - A minimum of 4 GB VRAM for the GPU.
   - A stable, non-metered internet connection.

## Installation

Follow these steps to set up the extension:

### Step 1: Clone the Repository
```bash
git clone https://github.com/eho2k22/ShopSavvy_Nano.git
```

### Step 2: Enable Developer Mode in Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle the **Developer Mode** switch at the top-right corner.

### Step 3: Load the Extension
1. Click on **Load Unpacked**.
2. Select the cloned directory containing the extension files.

### Step 4: Enable Gemini Nano API
1. Open a new Chrome tab and go to `chrome://flags/#prompt-api-for-gemini-nano`.
2. Enable the flag for **Gemini Nano Prompt API**.
3. Relaunch Chrome.

### Step 5: Verify Model Availability
1. Open Chrome DevTools (`Ctrl+Shift+I` or `Cmd+Opt+I`).
2. Run the following in the console:
   ```javascript
   (await ai.languageModel.capabilities()).available;
   ```
   - If it returns `"readily"`, you are good to go.

### Step 6: Start Shopping!
1. Open Amazon and interact with the extension by clicking its icon in the toolbar.
2. Use the chat interface to set your budget and preferences.

## Usage

1. **Set Budget**: Enter your shopping budget through the chatbot interface.
2. **Refresh Cart Data**: Click the shopping cart icon to ensure up-to-date cart insights.
3. **Get Recommendations**: Ask for product suggestions based on your budget, preferences, and cart history.

## Known Issues

- The extension may not function in Chrome's Incognito mode.
- Ensure sufficient storage space (at least 22 GB) for optimal performance.
- Non-English language support is experimental.

## Contribution

We welcome contributions! Please fork the repository, make your changes, and submit a pull request. Ensure your changes are well-documented and tested.

## Troubleshooting

- **Session ID Errors**: Ensure the Nano session is correctly created by checking the background script logs.
- **Model Not Downloading**: Leave Chrome open for a few minutes to allow the scheduler to start the download.
- **Feedback**: If you encounter issues, please report them under the repository’s Issues tab.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

## Credits

This project uses Google's Gemini Nano Prompt API for AI capabilities. For more information, visit the [Prompt API Documentation](https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c/edit?tab=t.0).


