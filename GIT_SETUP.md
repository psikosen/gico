# Setting Up Git for ICM

Follow these steps to initialize a Git repository and commit the code to GitHub:

## 1. Initialize the local repository

Open a terminal and navigate to the project directory:

```bash
cd /Users/psikosen/Desktop/gico
```

Initialize Git:

```bash
git init
```

## 2. Add all files to the repository

```bash
git add .
```

## 3. Commit the files

```bash
git commit -m "Initial commit: Interactive Conversation Manager (ICM)"
```

## 4. Create a repository on GitHub

Go to https://github.com/new and create a new repository named "ICM".

## 5. Link your local repository to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/ICM.git
```

Replace `YOUR-USERNAME` with your GitHub username.

## 6. Push the code to GitHub

```bash
git branch -M main
git push -u origin main
```

## 7. Verify

Go to your GitHub repository to confirm all files have been pushed correctly.
