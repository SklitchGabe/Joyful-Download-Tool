# World Bank Document Explorer

A user-friendly application to search, download, and organize World Bank project documents.

![World Bank Document Explorer](https://via.placeholder.com/800x400?text=World+Bank+Document+Explorer)

## Overview

The World Bank Document Explorer allows you to:

- Search for World Bank documents by project ID
- Filter documents by type (e.g., Procurement Plan, Project Appraisal Document)
- Download multiple documents at once
- Automatically rename documents based on their project ID

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or newer)
- [Python](https://www.python.org/downloads/) (version 3.8 or newer)
- [Git](https://git-scm.com/downloads) (optional, for downloading the source code)

## Installation

### Step 1: Download the application

Option 1: Download the ZIP file from the repository and extract it to a folder.

Option 2: If you have Git installed, open a terminal or command prompt and run: 

'''
git clone [repository-url]
cd world-bank-document-explorer
'''

### Step 2: Install frontend dependencies

Open a terminal or command prompt, navigate to the `frontend` folder, and run:

'''
cd frontend
npm install
'''

### Step 3: Install backend dependencies

Open a terminal or command prompt, navigate to the `backend` folder, and run:

'''
cd backend
pip install -r requirements.txt
'''
If the `requirements.txt` file is missing, install the following packages manually:

'''
pip install flask flask-cors requests tqdm PyPDF2 python-docx
'''

## Running the Application

You'll need to run both the frontend and backend components.

### Step 1: Start the backend server

Open a terminal or command prompt, navigate to the `backend` folder, and run:

'''
cd backend
python app.py
'''

### Step 2: Start the frontend application

Open a terminal or command prompt, navigate to the `frontend` folder, and run:

'''
cd frontend
npm run dev
'''

he frontend development server should start and display a URL like "http://localhost:3000".

### Step 3: Open the application

Open your web browser and navigate to the URL displayed by the frontend server (typically http://localhost:3000 or http://localhost:5173). You can right-click the link to the localhost in the terminal. 

## Using the Application

### Searching for Documents by Project ID

1. In the main interface, enter one or more World Bank project IDs in the text area.
   - Project IDs typically start with "P" followed by numbers (e.g., P123456)
   - You can enter multiple IDs separated by spaces or commas

2. Select a document type from the dropdown menu (or leave as "All Document Types").

3. Set the maximum number of documents per project.

4. Click the "Search" button.

5. The application will search the World Bank API and display matching documents.

### Downloading Documents

1. After searching, a list of documents will appear.

2. Select the documents you want to download by checking the boxes next to them.
   - You can use the "Select All" checkbox to select all documents at once.

3. Click one of the download buttons:
   - "Download Selected" - Downloads the documents with their original filenames
   - "Download & Rename" - Downloads the documents and renames them based on their project ID

4. Your browser will download a ZIP file containing the selected documents.

5. Extract the ZIP file to access your documents.

## Features

### PDF and DOCX Search

The application offers two search modes:
- PDF Search: Searches for PDF documents (default)
- DOCX Search: Searches specifically for Word documents

Toggle between these modes using the buttons at the top of the search form.

### Theme Options

You can switch between two visual themes:
- Default dark theme
- SDG (Sustainable Development Goals) theme

Use the theme toggle button in the top-right corner to switch between themes.

## Document Types

The application supports various World Bank document types, including:
- Procurement Plans
- Project Appraisal Documents
- Implementation Status Reports
- Environmental Assessments
- Loan Agreements
- And many more

## Troubleshooting

### Backend server won't start

- Make sure you have all required Python packages installed.
- Check if another application is using port 5000. If so, you can change the port in the backend/app.py file.

### Frontend server won't start

- Make sure you've installed all npm dependencies by running `npm install` in the frontend directory.
- Check if another application is using the frontend port (typically 3000 or 5173).

### No documents found

- Verify that you've entered valid World Bank project IDs.
- Try removing any document type filter to widen your search.
- Some projects may have limited publicly available documents.

### Download fails

- Check your internet connection.
- Some documents may be very large - ensure you have adequate disk space.
- Try downloading fewer documents at once.

## Privacy and Data Usage

This application only retrieves publicly available documents from the World Bank's public API. No user data is collected or stored beyond what's necessary for the current session.

## Need Help?

If you encounter any issues not covered in this guide, please contact ITS or if they are not helpful, contact Gabe Stephan, former IEGPL consultant.



