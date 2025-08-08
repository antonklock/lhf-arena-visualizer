# LHF Arena Visualizer

A 3D arena visualizer built with ThreeJS and TypeScript using Vite as the build tool.

## Features

- 🎮 Interactive 3D arena environment
- 🖱️ Mouse and keyboard controls
- 🎨 Real-time lighting and shadows
- 📱 Responsive design
- 🔧 TypeScript for better development experience
- ⚡ Fast development with Vite

## Controls

- **Mouse**: Click and drag to rotate the camera around the scene
- **Mouse Wheel**: Scroll to zoom in/out
- **WASD**: Move around the arena
- **Q/E**: Move up/down (with boost modifier)
- **Arrow Keys**: Alternative movement controls

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd lhf-arena-visualizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # ThreeJS components
│   ├── ArenaVisualizer.ts  # Main visualizer class
│   ├── CameraController.ts # Camera controls
│   └── Arena.ts            # 3D arena creation
├── utils/              # Utility functions
│   └── math.ts         # Mathematical helpers
└── main.ts            # Application entry point
```

## Technologies Used

- **ThreeJS** - 3D graphics library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting

## Customization

The arena can be easily customized by modifying the `Arena.ts` file. You can:

- Change arena dimensions
- Modify materials and colors
- Add new decorative elements
- Adjust lighting effects

The camera controls can be customized in `CameraController.ts` to modify:

- Movement speed
- Mouse sensitivity
- Zoom limits
- Key bindings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the linter and type checker
5. Submit a pull request

## License

MIT License - see LICENSE file for details
