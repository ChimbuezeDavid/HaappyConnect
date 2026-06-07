# HaappyConnect 👋

HaappyConnect is a professional consulting platform designed to connect **Seekers** (who want answers or guidance) with **Experts** (who offer professional advice). It consists of a universal mobile client application (built with Expo/React Native) and a robust backend API server (built with Node.js/Express).

The application is fully verified against Human-Computer Interaction (HCI) usability standards, featuring high text contrast, keyboard-aware views, clear interactive states, and a persistent, system-integrated dark/light theme switch.

---

## 🚀 Key Features

* **Blended Discovery Feed**: Experts can browse other experts, ask questions, or book live calls, allowing a seamless dual role (seeker/expert) within a single account.
* **1:1 Live Calls**: Seekers can schedule and book live consultation calls with pricing calculations based on hourly rates.
* **Written/Memo Questions**: Seekers can submit questions to experts and receive replies (text, voice, or video advice memos) played back via a custom styled Media Player.
* **Virtual Transaction Wallet**: Integrated wallet system allowing users to deposit virtual funds, pay for bookings, and view detailed ledger histories.
* **Segmented Appearance Switcher**: A persistent theme switcher under the Profile screen supporting **System** (OS default), **Light**, and **Dark** color schemes.
* **Profile Picture Editor**: Allows seekers and experts to edit their listing pictures using device camera/media library (`expo-image-picker`) and update their profile details.

---

## 🛠️ Tech Stack & Architecture

### Client-Side (Mobile App)
* **Framework**: React Native with **Expo (SDK 51)**
* **Navigation**: File-based routing using **Expo Router**
* **Styling**: Tailwind CSS integration using **NativeWind v4** (`react-native-css-interop`)
* **State Management**: **Zustand** (with persistent middleware)
* **Secure Storage**: **Expo SecureStore** (for tokens and theme preferences)
* **Icons**: **Lucide React Native**
* **Image Selection**: **Expo ImagePicker**

### Server-Side (Backend API)
* **Runtime**: **Node.js** with **TypeScript**
* **Framework**: **Express**
* **Database**: **MongoDB** with **Mongoose ODM**
* **Auth**: **JWT (JSON Web Tokens)**
* **Seed Script**: Automated database seeding script for quick testing data

---

## 📂 Project Directory Structure

```text
HaappyConnect/
├── assets/                     # App icons and splash screen media assets
├── server/                     # Backend API Express Server
│   ├── src/
│   │   ├── middleware/        # JWT Authentication verification
│   │   ├── models/            # Mongoose Schemas (User, Profile, Booking, etc.)
│   │   ├── routes/            # Express routes (auth, profile, wallet, bookings)
│   │   └── index.ts           # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── src/                        # React Native Mobile Client
│   ├── app/                    # Expo Router file-based screens
│   │   ├── (auth)/             # Login, Register, Welcome screens
│   │   ├── (onboarding)/       # Role-selection and setup wizards
│   │   ├── (tabs)/             # Home, Search, Bookings, Wallet, Profile
│   │   ├── bookings/           # Video/Audio response viewer
│   │   ├── expert/             # Expert detail and edit profile
│   │   └── seeker/             # Booking call and ask question sheets
│   ├── components/
│   │   └── ui/                 # Reusable themed widgets (ExpertCard, BottomSheet, etc.)
│   ├── lib/
│   │   └── api.ts              # Fetch configurations and global interceptors
│   ├── store/                  # Zustand stores (Auth, Onboarding, Theme)
│   ├── types/                  # Shared TypeScript interfaces
│   └── global.css              # Global styling configurations
├── package.json
├── tailwind.config.js          # NativeWind/Tailwind styling layout config
└── tsconfig.json
```

---

## 💻 Setup & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or newer recommended)
* [MongoDB](https://www.mongodb.com/) (running instance locally or via Atlas)
* Expo Go app on your physical device, or an iOS Simulator / Android Emulator

### 1. Backend Server Setup
Navigate into the server folder, install dependencies, configure your environment, and start the server:

```bash
cd server
npm install

# Create a local environment config file:
cp .env.example .env  # Or create a .env file and set PORT, MONGO_URI, and JWT_SECRET
# e.g., MONGO_URI=mongodb://localhost:27017/haappyconnect

# Seed database with sample data:
npm run seed

# Run the backend in development mode:
npm run dev
```

### 2. Client Mobile App Setup
In the project root folder, install client dependencies and run the Expo development engine:

```bash
# Return to the root folder
cd ..
npm install

# Start the Expo development server:
npx expo start
```

* Scan the QR code displayed in the terminal with your device camera (iOS) or the **Expo Go** app (Android) to open the application.
* Or press **`a`** to open in Android Emulator, or **`i`** to open in iOS Simulator.

---

## 🧪 Verification & Linting

Verify client and server compiler status before publishing:

```bash
# Verify client typescript compilation:
npx tsc --noEmit

# Verify server typescript compilation:
cd server
npx tsc --noEmit
```
Both typecheck steps compile cleanly without warning issues.
