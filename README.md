# Irish Climbing Wiki Mobile Application
* Final Year Project (FYP)
* Name: Li Anran
* Student ID: C00292764
* Supervisor: Tom Corcoran
## Project Overview
The Irish Climbing Wiki Mobile Application is a cross-platform mobile app designed for climbing enthusiasts to access and explore climbing route information across Ireland. The app presents open data from the Irish Climbing Wiki (powered by MediaWiki) through a modern mobile interface, featuring geographic organization, map-based navigation, and detailed route information.

## Core Features
### Mandatory Features
* Fetch and display climbing site information via MediaWiki API
* Organize sites by province and county
* Integrated map navigation with site locations
* Dynamically generate map markers based on coordinate data
### Discretionary Features 
* Color-coded markers for site types (Sea Cliff / Sport Climbing / Bouldering)
* Filter and search by type, difficulty, and update date
* Responsive mobile-friendly interface design
### Exceptional Features
* In-app editing with API synchronization to update wiki content
* User favorites and personalization features
* Community interaction features (e.g., recently updated alerts)

## Technology Stack
* Frontend Framework: React Native + Expo
* Mapping Service: React Native Maps
* Data Storage: SQLite + AsyncStorage + Static json package
* Data Source: MediaWiki REST API

## Prerequisites
* Node.js (v18 or higher)
* npm or yarn
* Expo CLI (npm install -g expo-cli)
* iOS Simulator or Android Emulator/Physical device
