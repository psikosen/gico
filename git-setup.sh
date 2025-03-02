#!/bin/bash

# Initialize Git repository
git init

# Add all files
git add .

# Commit the files
git commit -m "Initial commit: Interactive Conversation Manager (ICM)"

echo "Repository initialized and files committed successfully!"
echo "To push to GitHub, create a repository named 'ICM' and run:"
echo "git remote add origin https://github.com/YOUR-USERNAME/ICM.git"
echo "git branch -M main"
echo "git push -u origin main"
