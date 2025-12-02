# 🐕 Paws & Pedigrees

A comprehensive dog kennel management simulation game built with React, TypeScript, and Supabase.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-blue)](https://tailwindcss.com/)

> Build your dream kennel, breed champion dogs, compete in tournaments, and manage your virtual dog empire!

## ✨ Features

### 🏠 Kennel Management
- **Adopt & Rescue** - Choose from 40+ unique dog breeds across 6 rarity tiers
- **Daily Care** - Feed, water, play, and groom your dogs to keep them happy and healthy
- **Kennel Upgrades** - Expand your kennel to house more dogs and unlock new features
- **Staff Management** - Hire trainers, groomers, vets, and handlers to automate tasks

### 🧬 Breeding System
- **Advanced Genetics** - Realistic inheritance of stats, coat colors, and traits
- **Designer Breeds** - Create unique mixed breeds with combined characteristics
- **Pregnancy & Puppies** - Manage breeding cycles and raise puppies to adulthood
- **Pedigree Tracking** - Full family tree and lineage system

### 🎓 Training & Development
- **Multi-Stat Training** - Train speed, agility, strength, endurance, and obedience
- **Puppy Programs** - Early training programs for young dogs
- **Specializations** - 8 career paths including agility champion, therapy dog, and working dog
- **Skill Progression** - Level up your training expertise over time

### 🏆 Competitions
- **4 Competition Types** - Agility, obedience, conformation shows, and weight pulling
- **Tier System** - Progress from local to regional, national, and championship events
- **Tournament Brackets** - Compete in elimination-style tournaments for massive prizes
- **Leaderboards** - Track your rankings and compare with other players

### 🎖️ Achievements & Progression
- **100+ Achievements** - Unlock achievements for milestones and accomplishments
- **Prestige System** - Earn prestige points to unlock special bonuses
- **Certifications** - Earn titles like CH, GCH, MACH, and HOF for your dogs
- **Level System** - Progress through 50+ player levels

### 🌦️ Dynamic Weather
- **Four Seasons** - Experience spring, summer, fall, and winter with unique effects
- **Weather Conditions** - 7 different weather types affecting gameplay
- **Seasonal Events** - Special events and bonuses throughout the year
- **Real-time Integration** - Weather changes based on actual calendar dates

### 🎨 Modern UI/UX
- **Responsive Design** - Play on desktop, tablet, or mobile
- **Accessibility** - Full keyboard navigation and screen reader support
- **Toast Notifications** - Clear feedback for all actions
- **Modal System** - Elegant popups and dialogs
- **Loading States** - Smooth loading indicators

### ⚡ Performance Optimized
- **Lazy Loading** - Components load only when needed
- **Virtual Scrolling** - Handle hundreds of dogs without lag
- **Memoization** - Optimized calculations and rendering
- **Code Splitting** - Fast initial load times

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/paws-and-pedigrees.git
   cd paws-and-pedigrees
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📖 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Complete development guide
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Testing strategies and examples
- **[Performance Guide](docs/PERFORMANCE_GUIDE.md)** - Optimization techniques
- **[Contributing](CONTRIBUTING.md)** - How to contribute

## 🏗️ Tech Stack

### Frontend
- **React 18.2** - UI library
- **TypeScript 5.0** - Type safety
- **Tailwind CSS 3.3** - Styling
- **Zustand** - State management
- **Vite** - Build tool

### Backend
- **Supabase** - Database and authentication
- **PostgreSQL** - Database
- **Row Level Security** - Data protection

### Testing
- **Vitest** - Unit testing
- **Testing Library** - Component testing
- **Playwright** - E2E testing

### Tools
- **ESLint** - Linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## 📊 Project Statistics

- **40+** Unique dog breeds
- **100+** Achievements to unlock
- **8** Career specializations
- **4** Competition types
- **7** Staff roles
- **9** Certifications to earn
- **6** Rarity tiers

## 🎮 Game Systems

### Core Loop
```
Care → Train → Compete → Earn → Upgrade → Expand
  ↑                                          ↓
  └──────────────────────────────────────────┘
```

### Progression Path
1. **Early Game** (Levels 1-10)
   - Adopt first dog
   - Learn basic care
   - Enter local competitions
   - Save money for breeding

2. **Mid Game** (Levels 11-25)
   - Expand kennel
   - Hire staff
   - Breed better dogs
   - Win regional events

3. **Late Game** (Levels 26-50)
   - Championship tournaments
   - Hall of Fame dogs
   - Max prestige
   - Complete collection

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run tests
npm run test:ui      # Open test UI
npm run test:coverage # Generate coverage report

# Code Quality
npm run lint         # Lint code
npm run lint:fix     # Fix lint errors
npm run format       # Format code
npm run type-check   # Check types

# Database
npm run migrate      # Run migrations
npm run db:reset     # Reset database
```

### Project Structure

```
paws-and-pedigrees/
├── src/
│   ├── components/      # React components
│   ├── stores/          # Zustand stores
│   ├── types/           # TypeScript types
│   ├── data/            # Game data
│   ├── utils/           # Utilities
│   └── services/        # API services
├── docs/                # Documentation
├── supabase/           # Database migrations
└── public/             # Static assets
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- All contributors who have helped improve the game
- The React and TypeScript communities
- Supabase for excellent backend services
- Dog lovers everywhere 🐕

## 📫 Contact

- **Issues**: [GitHub Issues](https://github.com/your-username/paws-and-pedigrees/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/paws-and-pedigrees/discussions)
- **Email**: your-email@example.com

## 🗺️ Roadmap

### Version 1.1 (Q2 2024)
- [ ] Multiplayer trading
- [ ] Dog shows with judges
- [ ] Social features
- [ ] Mobile app

### Version 1.2 (Q3 2024)
- [ ] Story mode campaign
- [ ] Custom kennels
- [ ] Mod support
- [ ] Cloud saves

### Version 2.0 (Q4 2024)
- [ ] 3D graphics
- [ ] VR support
- [ ] Advanced AI
- [ ] Esports tournaments

## ⭐ Show Your Support

If you like this project, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 🤝 Contributing code
- 📢 Sharing with friends

---

Made with ❤️ and lots of ☕ by the Paws & Pedigrees team

**[Play Now](https://paws-and-pedigrees.com)** | **[Documentation](docs/)** | **[Report Bug](https://github.com/your-username/paws-and-pedigrees/issues)** | **[Request Feature](https://github.com/your-username/paws-and-pedigrees/issues)**
