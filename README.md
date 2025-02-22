# 🚗 Path Planner: Interactive Potential Field Navigation

A beautiful and interactive demonstration of potential field-based path planning using React, TypeScript, and Vite! Watch as a vehicle navigates through obstacles using artificial potential fields to find its way to the goal.

## ✨ Features

- 🎯 Interactive start position and heading setting
- 🚧 Random obstacle generation
- 🌊 Real-time visualization of potential fields
- 🎨 Dark/Light theme support
- 🛣️ Multi-path visualization
- 🎮 Adjustable parameters:
  - Vehicle speed
  - Goal attraction force
  - Obstacle repulsion force
  - Field visualization scale
- 📱 Responsive design with retina display support

## 🔧 Technical Implementation

The path planner uses a combination of attractive and repulsive potential fields:

- **Attractive Field**: Linear attraction towards the goal
- **Repulsive Field**: \[F_{rep} = k_{rep} (\frac{1}{\rho} - \frac{1}{\rho_0}) \frac{1}{\rho^2} \nabla\rho\]
  where \(\rho\) is distance to obstacle surface and \(\rho_0\) is the influence radius

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/DifferentialPathPlanner.git
cd DifferentialPathPlanner
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🎮 How to Use

1. **Set Starting Position**: 
   - Click the "Set Position" button
   - Click and drag on the canvas to position and orient the vehicle
   - Click "Confirm Position" when ready

2. **Adjust Parameters** (optional):
   - Modify vehicle speed
   - Adjust goal attraction strength
   - Change obstacle repulsion intensity
   - Scale the field visualization arrows

3. **Start Simulation**:
   - Click the "Start" button to begin
   - Watch as the vehicle navigates to the goal!

4. **Additional Features**:
   - Toggle field visualization
   - Switch between magnitude/component view
   - Enable path prediction
   - View multiple possible paths
   - Switch between light/dark themes

## 🎨 Visualization Options

- **Show Field**: Visualize the potential field vectors
- **Show Magnitude**: Toggle between force magnitude and component visualization
- **Show Car Path**: Display the predicted path from current position
- **Show Paths**: Calculate and display multiple possible paths from different starting positions

## 🤝 Contributing

Feel free to open issues and pull requests! This is an educational project meant to help understand potential field-based path planning.

## 📝 License

MIT License - feel free to use and modify for your own projects!

## 🙏 Acknowledgments

Built with:
- React
- TypeScript
- Vite
- Material-UI
- Love for robotics and path planning 🤖
