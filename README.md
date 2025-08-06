# Design Adviser

A web application for uploading design images and receiving **AI-powered design advice** using OpenAI's GPT-4 Vision.

## ✨ Features

- **🤖 AI-Powered Analysis**: Real design critique using OpenAI GPT-4 Vision
- **📤 Image Upload**: Drag & drop, file browse, or copy/paste images  
- **📝 Context & Questions**: Provide design context and specific areas for inquiry
- **⚙️ Global Settings**: Customize system-level advice with company/brand guidelines
- **📅 Timeline View**: See all design entries with timestamps
- **🔄 Version Management**: Track design iterations and evolution
- **👀 Version Navigation**: Compare different versions of the same design

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure OpenAI API
1. Get your OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Add your API key to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Run the Development Server
```bash
npm run dev
```

### 4. Open the Application
Visit [http://localhost:3000](http://localhost:3000) in your browser

## 💡 How It Works

The app uses **OpenAI's GPT-4 Vision model** to analyze your uploaded designs and provide professional feedback on:

- **Visual Hierarchy & Layout**
- **Color & Typography** 
- **User Experience**
- **Accessibility Considerations**
- **Brand Alignment**
- **Specific Recommendations**
- **Actionable Next Steps**

## 🎯 Usage

1. **Configure Settings** (optional): Set up global brand guidelines and preferences
2. **Upload Design**: Use drag/drop, file picker, or paste from clipboard
3. **Add Context**: Describe your design's purpose and target audience  
4. **Ask Questions**: Specify what aspects you want feedback on
5. **Get AI Analysis**: Receive detailed, professional design critique
6. **Track Progress**: View your design timeline and create new versions

## 🛠 Technology Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **OpenAI GPT-4 Vision** for AI analysis
- **Radix UI** primitives
- **Lucide React** icons

## 📁 Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/analyze/    # OpenAI API integration
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main application
├── components/ui/       # Reusable UI components  
├── lib/                # Utility functions & OpenAI client
└── types/              # TypeScript type definitions
```

## 🔧 Environment Variables

Create a `.env.local` file with:

```env
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Customize the model (default: gpt-4o)
OPENAI_MODEL=gpt-4o
```

## ⚠️ Important Notes

- **API Costs**: Each design analysis uses OpenAI's API and incurs costs
- **Image Privacy**: Images are sent to OpenAI for analysis
- **Rate Limits**: Respect OpenAI's API rate limits
- **Fallback**: App works without API key for design organization

## 🚀 Deployment

The app can be deployed to Vercel, Netlify, or any platform supporting Next.js. Remember to set your environment variables in the deployment platform.

## 📄 License

MIT License - Feel free to use this project as a starting point for your own design tools!