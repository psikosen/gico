#!/bin/bash

# Change to the project directory
cd /Users/psikosen/Desktop/gico

# Initialize Git repository
git init

# Add all files
git add .

# Set Git user information if needed
# Uncomment and modify these lines if Git user is not configured
# git config user.name "Your Name"
# git config user.email "your.email@example.com"

# Commit files
git commit -m "Initial commit: gico - AI Conversation Manager"

echo "Repository initialized and files committed successfully!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub repository named 'gico' at https://github.com/new"
echo "2. Run the following commands to push to GitHub:"
echo "   git remote add origin https://github.com/YOUR-USERNAME/gico.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Replace YOUR-USERNAME with your GitHub username"
