# gico Project Git Commit Instructions

Follow these steps to commit the gico (AI Conversation Manager) project to GitHub:

## 1. Open Terminal

Open Terminal on your Mac and navigate to the project directory:

```bash
cd /Users/psikosen/Desktop/gico
```

## 2. Initialize Git Repository

Initialize a new Git repository in the project directory:

```bash
git init
```

## 3. Add All Files to Git

Add all the project files to the Git repository:

```bash
git add .
```

## 4. Commit the Files

Create the initial commit with a descriptive message:

```bash
git commit -m "Initial commit: gico - AI Conversation Manager"
```

## 5. Create a GitHub Repository

Go to GitHub in your web browser and create a new repository named "gico":
- Visit: https://github.com/new
- Set the repository name to "gico"
- Add the description: "AI Conversation Manager - A Tauri-based desktop application for managing AI conversations with a mind map interface"
- Choose public or private visibility as preferred
- Leave "Initialize this repository with a README" unchecked
- Click "Create repository"

## 6. Connect Local Repository to GitHub

After creating the repository, GitHub will show instructions. Run these commands to connect your local repository to GitHub:

```bash
git remote add origin https://github.com/YOUR-USERNAME/gico.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

## 7. Verify the Repository

Visit your GitHub repository page to verify that all files have been successfully pushed:

```
https://github.com/YOUR-USERNAME/gico
```

## 8. Future Commits

For future changes, you can use these commands to commit and push:

```bash
git add .
git commit -m "Your descriptive commit message"
git push
```

The gico project is now successfully committed to GitHub!
