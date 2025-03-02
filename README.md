# Interactive Conversation Manager (ICM)

A Tauri-based desktop application designed to manage AI-driven conversations using the Gemini API and storing data locally with SQLite. Features an innovative mind map visualization for intuitive navigation.

## Features

- **Mind Map Interface**: Visual representation of conversations as interconnected nodes
- **Glassmorphic UI**: Elegant, transparent user interface with blur effects
- **Conversation Management**: Create, edit, delete, and link conversations
- **API Integration**: Secure interaction with the Gemini API for real-time AI responses
- **Local Data Persistence**: Uses SQLite to store conversations, messages, tags, and links
- **Additional Features**:
  - Tagging system for organization
  - Global and in-conversation search
  - Interactive visualization with zoom, pan, and selection

## Technologies Used

- **Frontend**: Vanilla JavaScript with D3.js for visualization
- **Backend**: Rust with Tauri framework
- **Database**: SQLite for local data storage
- **Visualization**: D3.js force-directed graph layout

## Architecture

### Frontend

- Renders the glassmorphic UI and mind map visualization
- Handles user interactions and graph manipulation
- Provides dynamic conversation viewing and editing

### Backend

- Manages business logic, including database interactions
- Handles error logic for database and API calls
- Implements SQLite integration for persistent storage

### Database Schema

- **Conversations**: Stores conversation metadata
- **Messages**: Stores individual messages
- **ConversationLinks**: Manages relationships between conversations
- **Tags**: Organizes conversations with user-defined tags

## Setup and Installation

1. Ensure you have Rust and Node.js installed
2. Clone the repository
3. Navigate to the project directory
4. Run `npm install` to install frontend dependencies
5. Run `cargo tauri dev` to start the application in development mode

## Building for Production

```bash
cargo tauri build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
