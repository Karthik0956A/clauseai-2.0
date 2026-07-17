# ClauseAI - Intelligent Legal Assistant

ClauseAI is an AI-powered legal document assistant designed to help users understand, analyze, and compare legal agreements in simple language. The project focuses on making complex legal text easier to interpret for non-lawyers, while providing useful tools for contract review, risk detection, and clause suggestions.

## Project Overview

Legal documents are often difficult to read because they contain technical language, long clauses, hidden obligations, and one-sided terms. ClauseAI solves this by combining a modern web interface with AI-based document understanding. Users can upload a legal file, chat with it, compare two agreements, scan for risks, and generate safer alternatives for risky clauses.

The application is built as a full-stack Next.js project with authentication, database persistence, and AI integration. It uses Google Gemini for document analysis and MongoDB for storing user accounts and conversation history.

## Main Goals

The main goals of ClauseAI are:

- simplify legal language for everyday users
- highlight risks and unfair terms in contracts
- compare agreements side by side
- preserve chat history and document context
- provide a polished, professional user experience
- make legal document review faster and easier

## Key Features

### 1. AI Legal Assistant Chat

ClauseAI includes a chat interface that lets users ask questions about legal documents, clauses, policies, and terms. The assistant explains legal content in plain English and can also support multilingual responses.

Features of the chat assistant include:

- document-aware chat responses
- conversational legal explanations
- voice input and audio processing
- text-to-speech for assistant replies
- PDF export of chat summaries
- language selection for English, Hindi, and Kannada
- persistent conversation history

### 2. Document Upload

Users can upload legal files directly from the dashboard. The upload system supports:

- PDF files
- image files
- text files

Uploaded files are sent to Google Gemini file processing, which allows the AI to analyze the content later in chat, risk scoring, and suggestions.

### 3. Agreement Comparison

The agreement comparator allows users to upload two contracts and compare them automatically. It highlights differences clause by clause and marks the risk level of each change.

This feature is useful for:

- comparing old and new contract versions
- identifying new risks introduced in a revised agreement
- detecting changes in liability, termination, jurisdiction, and payment terms
- reviewing contract updates more efficiently

### 4. Risk Visualization

ClauseAI can analyze a document and generate a risk score from 0 to 100. It also breaks down risky clauses into categories such as:

- financial consequence
- legal penalties
- loss of rights
- time-based obligations

The risk panel presents:

- an overall legal risk score
- a list of risky clauses
- a chart of severity distribution
- a chart showing category breakdown

This gives users a quick visual understanding of how risky a document may be.

### 5. Safer Clause Suggestions

The assistant can suggest safer alternatives for risky or unfair clauses. It identifies problematic wording and generates a more balanced version along with a short explanation.

This feature is especially useful for:

- termination clauses
- liability clauses
- renewal clauses
- indemnity clauses
- restrictive terms
- clause rewording for fairness

### 6. Learned Counsel Directory

The project includes a lawyer directory section that presents a formal list of legal professionals. This is more of a presentation feature, but it helps the app feel like a complete legal platform.

It includes:

- lawyer profiles
- court filters
- search by specialization
- profile modal view
- appointment/contact-style actions

### 7. Authentication and Session Management

ClauseAI includes custom authentication with:

- signup
- login
- logout
- session verification
- protected routes

Sessions are stored using JWT cookies, and user credentials are saved in MongoDB with password hashing.

### 8. Conversation History

Chat conversations are stored per user, allowing users to resume previous legal discussions. Each conversation can include:

- messages
- timestamp
- associated document
- generated title

This makes the app feel more practical and production-ready.

## Tech Stack

ClauseAI is built with the following technologies:

### Frontend

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Radix UI components
- Lucide React icons

### Backend

- Next.js API routes
- MongoDB
- Mongoose
- JWT-based sessions
- bcryptjs password hashing

### AI and Document Processing

- Google Gemini API
- Gemini file upload and document analysis
- Google Generative AI SDK

### Other Tools

- jsPDF
- html2canvas
- React Markdown
- Recharts
- Sonner toast notifications

## Project Architecture

The project follows a modular structure with clear separation of responsibilities.

### App Layer

The `app` directory contains:

- the landing page
- authentication pages
- dashboard entry point
- API routes for upload, chat, compare, risk, suggestion, and auth

### Components Layer

The `components` directory contains reusable UI and feature modules such as:

- dashboard
- chat interface
- agreement comparator
- risk visualization
- document uploader
- lawyer directory
- chat history
- header and layout components

### Library Layer

The `lib` folder contains core utilities such as:

- database connection
- authentication helpers
- token generation and validation

### Data Models

The `models` folder contains Mongoose schemas for:

- users
- conversations

## How the App Works

### Step 1: User Authentication

The user signs up or logs in. Once authenticated, a session cookie is created and the middleware allows access to the protected dashboard.

### Step 2: Document Upload

The user uploads a legal document. The file is sent to the backend, temporarily stored, and then uploaded to Gemini for AI processing.

### Step 3: Chat and Analysis

The user can now chat with the document, ask questions, and get explanations in plain language. The chat system sends the file context and conversation history to Gemini for response generation.

### Step 4: Risk Scan

The risk feature analyzes the uploaded document and returns a structured JSON response containing the overall risk score and individual clause risks.

### Step 5: Comparison

If the user uploads two agreements, the compare feature identifies differences and labels them by risk severity.

### Step 6: Save and Resume

Conversations are saved to MongoDB and can be reopened later from history.

## Security and Data Handling

ClauseAI uses a secure and practical authentication approach:

- passwords are hashed before storage
- session tokens are signed using JWT
- cookies are HTTP-only
- protected routes are enforced through middleware
- user-specific conversation data is stored in MongoDB

The application also keeps uploaded document context tied to the session and conversation flow.

## Strengths of the Project

ClauseAI stands out because it combines multiple useful legal workflows in one application:

- document chat
- clause explanation
- risk scoring
- contract comparison
- safer clause generation
- multilingual support
- audio support
- conversation persistence

It is not just a chatbot. It is a complete legal assistant workflow platform.

## Interview Talking Points

If you are presenting this project in an interview, you can say:

- I built ClauseAI to simplify legal understanding for everyday users.
- The app uses AI to analyze contracts, compare versions, and highlight legal risks.
- I implemented authentication, document upload, chat persistence, and structured AI outputs.
- The system uses Next.js, MongoDB, and Gemini to create a full-stack AI product.
- I focused on both functionality and user experience with a modern dashboard and clean workflow.

## Possible Future Enhancements

Some improvements that could be added later are:

- real PDF text extraction before Gemini upload
- more advanced role-based access control
- better chat search and filtering
- document annotation and highlighting
- exportable comparison reports
- support for more languages
- legal citation lookup by jurisdiction
- lawyer booking integration
- improved analytics for document usage

## Disclaimer

ClauseAI is an educational and productivity tool. It does not provide professional legal advice. Users should always consult a qualified legal professional for legal decisions.

## Summary

ClauseAI is a modern AI legal assistant that helps users upload documents, chat with them, compare agreements, detect risks, and suggest safer wording. It combines AI, authentication, database persistence, and a strong UI into a practical legal-tech project.