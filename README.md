# Crystal Services Website

A modern, responsive website for Crystal Services - a professional laundry and dry cleaning business located in Borgerhout, Belgium.

## 🌟 Features

- **Modern Design**: Clean, professional layout built with Next.js and Tailwind CSS
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **SEO Optimized**: Built with Next.js for excellent search engine optimization
- **Fast Performance**: Leveraging Next.js App Router for optimal loading speeds
- **Accessible**: Semantic HTML and proper accessibility practices

## 🚀 Technology Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React** - Component-based UI library

## 📋 Services Showcased

- Strijken van kleding (Clothing ironing)
- Wassen en drogen (Washing and drying)
- Reiniging van delicate kledingstukken (Delicate clothing cleaning)
- Bedrijfskleding (Business clothing care)
- Haal- en brengservice (Pickup and delivery service)

## 🏢 Business Information

- **Company**: Crystal Services
- **Address**: Lodewijk van berckenlaan, 2140 Borgerhout
- **Phone**: 0494 40 38 41
- **Email**: info@crystal-services.be
- **Special Offer**: Free pickup/delivery for orders €50+

## 📅 Opening Hours

- Monday - Friday: 8:00 - 18:00
- Saturday: CLOSED
- Sunday & Holidays: CLOSED
- Pickup/delivery available after 18:30

## 💬 Chatbot

De chat rechtsonder op elke pagina (`public/chat.js`) stuurt vragen naar `/api/chat`, dat antwoordt met Claude (AI) op basis van onze prijslijst, droogkuisregels, openingsuren en de oktoberactie.

- **Prijzen, uren of acties aanpassen:** `src/app/api/chat/kennis.ts`. De AI en de reserve-antwoorden halen alles daar.
- **Nodig op de server:** de omgevingsvariabele `ANTHROPIC_API_KEY` (aan te maken op console.anthropic.com).
- Zonder sleutel, of als de AI even niet bereikbaar is, antwoordt de chat met eenvoudige regels (`src/app/api/chat/regels.ts`), maar wel met dezelfde prijzen.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── components/
    ├── Header.tsx
    ├── Hero.tsx
    ├── Services.tsx
    ├── OpeningHours.tsx
    ├── BusinessClothing.tsx
    ├── Contact.tsx
    └── Footer.tsx
```

## 🎨 Design Features

- **Gradient backgrounds** for visual appeal
- **Card-based layouts** for content organization
- **Smooth scrolling navigation** between sections
- **Hover effects** for interactive elements
- **Mobile-first responsive design**
- **Professional color scheme** (blues, grays, whites)

## 📱 Responsive Design

The website is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔧 Development

This project follows modern React and Next.js best practices:
- Functional components with TypeScript
- App Router for file-based routing
- Tailwind CSS for consistent styling
- Component-based architecture for maintainability

## 📄 License

This project is created specifically for Crystal Services. All rights reserved.

---

**Note**: The shopping cart functionality has been intentionally removed as this is not an e-commerce website, focusing instead on service presentation and contact information.
