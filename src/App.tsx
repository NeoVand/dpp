import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Box,
  Button,
  Container,
  Paper,
  Slider,
  Typography,
  ThemeProvider,
  createTheme,
  Stack,
  Alert,
  Divider,
  Checkbox,
  IconButton,
  useMediaQuery,
  CssBaseline
} from '@mui/material'
import {
  PlayArrow,
  Stop,
  GpsFixed,
  Check,
  Speed as SpeedIcon,
  Brightness4,
  Brightness7
} from '@mui/icons-material'
import './App.css'

interface Car {
  x: number
  y: number
  angle: number
  velocity: number
}

interface Obstacle {
  x: number      // center x
  y: number      // center y
  radius: number // radius of the circle
}


interface Vector2D {
  x: number;
  y: number;
}

interface Force {
  x: number;
  y: number;
}

interface PathPoint {
  x: number;
  y: number;
}

interface SimulationPath {
  points: PathPoint[];
  completed: boolean;
}

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light')

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#94a3b8' : '#475569', // Slate-400 : Slate-600
        light: mode === 'dark' ? '#cbd5e1' : '#94a3b8', // Slate-300 : Slate-400
        dark: mode === 'dark' ? '#64748b' : '#334155', // Slate-500 : Slate-700
      },
      secondary: {
        main: mode === 'dark' ? '#93c5fd' : '#3b82f6', // Blue-300 : Blue-500
        light: mode === 'dark' ? '#bfdbfe' : '#60a5fa', // Blue-200 : Blue-400
        dark: mode === 'dark' ? '#60a5fa' : '#2563eb', // Blue-400 : Blue-600
      },
      success: {
        main: mode === 'dark' ? '#86efac' : '#22c55e', // Green-300 : Green-500
        light: mode === 'dark' ? '#bbf7d0' : '#4ade80', // Green-200 : Green-400
        dark: mode === 'dark' ? '#4ade80' : '#16a34a', // Green-400 : Green-600
      },
      error: {
        main: mode === 'dark' ? '#fca5a5' : '#ef4444', // Red-300 : Red-500
        light: mode === 'dark' ? '#fecaca' : '#f87171', // Red-200 : Red-400
        dark: mode === 'dark' ? '#f87171' : '#dc2626', // Red-400 : Red-600
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8fafc', // Slate-900 : Slate-50
        paper: mode === 'dark' ? '#1e293b' : '#ffffff', // Slate-800 : White
      },
      text: {
        primary: mode === 'dark' ? '#f8fafc' : '#0f172a', // Slate-50 : Slate-900
        secondary: mode === 'dark' ? '#cbd5e1' : '#475569', // Slate-300 : Slate-600
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const carRef = useRef<Car>({ x: 50, y: 50, angle: 0, velocity: 0 })
  const [obstacles] = useState<Obstacle[]>(() => generateRandomObstacles())
  const [goal] = useState({ x: 750, y: 550 })
  const animationFrameRef = useRef<number | undefined>(undefined)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [hasReachedGoal, setHasReachedGoal] = useState(false)
  const [isSettingStart, setIsSettingStart] = useState(true)
  const isDraggingRef = useRef(false)
  const [showField, setShowField] = useState(true)
  const [goalWeight, setGoalWeight] = useState(0.5)
  const [obstacleWeight, setObstacleWeight] = useState(3000.0)
  const fieldResolution = 7 // Reduced from 10 to increase resolution
  const [arrowScale, setArrowScale] = useState(1.0)
  const [showFieldMagnitude, setShowFieldMagnitude] = useState(false)
  const [showPaths, setShowPaths] = useState(false)
  const [paths, setPaths] = useState<SimulationPath[]>([])
  const [isCalculatingPaths, setIsCalculatingPaths] = useState(false)
  const [randomizeHeading, setRandomizeHeading] = useState(false)
  const [showCarPath, setShowCarPath] = useState(false)

  function generateRandomObstacles(): Obstacle[] {
    const obstacles: Obstacle[] = []
    for (let i = 0; i < 10; i++) {
      obstacles.push({
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50,
        radius: Math.random() * 20 + 15
      })
    }
    return obstacles
  }

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = color
    
    // Draw arrow
    ctx.beginPath()
    ctx.moveTo(-15, -8)  // Start at tail left
    ctx.lineTo(15, 0)    // Line to head
    ctx.lineTo(-15, 8)   // Line to tail right
    ctx.closePath()
    ctx.fill()
    
    ctx.restore()
  }, [])

  const calculatePotentialField = useCallback((position: Vector2D): Force => {
    // Initialize total force
    let totalForce: Force = { x: 0, y: 0 };
    
    // Calculate attractive force (F_att = -k_att * (q - q_goal))
    const distToGoal = Math.sqrt(
      Math.pow(goal.x - position.x, 2) + Math.pow(goal.y - position.y, 2)
    );
    
    // Attractive force - linear for better behavior at long distances
    const F_att: Force = {
      x: -goalWeight * (position.x - goal.x) / distToGoal,
      y: -goalWeight * (position.y - goal.y) / distToGoal
    };
    
    // Add attractive force to total
    totalForce.x += F_att.x;
    totalForce.y += F_att.y;
    
    // Calculate repulsive forces from all obstacles
    obstacles.forEach(obstacle => {
      // Calculate ρ(q) - distance to obstacle surface
      const dx = position.x - obstacle.x;
      const dy = position.y - obstacle.y;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      const rho = Math.max(0.1, distToCenter - obstacle.radius); // Distance to surface
      
      // Define influence distance ρ_0
      const rho_0 = obstacle.radius * 4;
      
      // Only apply repulsive force if within influence distance
      if (rho <= rho_0) {
        // Calculate unit vector pointing away from obstacle
        const dirX = dx / distToCenter;
        const dirY = dy / distToCenter;
        
        // Calculate repulsive force magnitude using the correct formula
        // F_rep = k_rep * (1/ρ - 1/ρ_0) * (1/ρ^2) * ∇ρ
        const magnitude = obstacleWeight * (1/rho - 1/rho_0) / (rho * rho);
        
        // Add repulsive force to total
        totalForce.x += magnitude * dirX;
        totalForce.y += magnitude * dirY;
      }
    });
    
    return totalForce;
  }, [obstacles, goal, goalWeight, obstacleWeight])

  const drawPotentialField = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showField) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const visualResolution = fieldResolution;
    
    for (let y = visualResolution; y < canvas.height - visualResolution; y += visualResolution) {
      for (let x = visualResolution; x < canvas.width - visualResolution; x += visualResolution) {
        const force = calculatePotentialField({ 
          x: x * dpr / scaleX, 
          y: y * dpr / scaleY 
        });
        
        // Calculate magnitude of force vector
        const magnitude = Math.sqrt(force.x * force.x + force.y * force.y);
        
        // Skip drawing arrows where force is very small
        if (magnitude < 0.01) continue;
        
        // Normalize and scale the force vector (smaller arrows for denser field)
        const baseArrowLength = visualResolution * 0.8;
        const maxArrowLength = baseArrowLength * arrowScale;
        const scale = Math.min(maxArrowLength / magnitude, maxArrowLength);
        const arrowLength = Math.min(magnitude * scale, maxArrowLength);
        
        // Calculate arrow direction
        const angle = Math.atan2(force.y, force.x);
        
        // Draw arrow
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // Set arrow color based on magnitude
        const alpha = 0.8; // Increased from 0.7 for better visibility
        
        if (showFieldMagnitude) {
          // Single color with intensity based on magnitude
          const color = mode === 'dark' ? '147, 197, 253' : '59, 130, 246'; // Blue-200 : Blue-500
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.strokeStyle = ctx.fillStyle;
        } else {
          // Direction-based coloring with better contrast
          const absX = Math.abs(force.x);
          const absY = Math.abs(force.y);
          const total = absX + absY;
          if (mode === 'dark') {
            // Dark mode: brighter, more saturated colors
            const r = Math.floor(252 * (absY / total)); // Red-200
            const b = Math.floor(252 * (absX / total)); // Blue-200
            ctx.fillStyle = `rgba(${r}, 165, ${b}, ${alpha})`;
          } else {
            // Light mode: deeper, richer colors
            const r = Math.floor(220 * (absY / total)); // Red-600
            const b = Math.floor(220 * (absX / total)); // Blue-600
            ctx.fillStyle = `rgba(${r}, 40, ${b}, ${alpha})`;
          }
          ctx.strokeStyle = ctx.fillStyle;
        }
        
        // Draw arrow line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLength, 0);
        ctx.lineWidth = 1.5; // Increased from 1 for better visibility
        ctx.stroke();
        
        // Draw arrow head
        const headLength = Math.min(6 * arrowScale, arrowLength * 0.3);
        const headWidth = headLength * 0.5;
        ctx.beginPath();
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(arrowLength - headLength, headWidth);
        ctx.lineTo(arrowLength - headLength, -headWidth);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }
  }, [calculatePotentialField, showField, fieldResolution, obstacles, obstacleWeight, arrowScale, showFieldMagnitude, mode])

  const drawPaths = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showPaths) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    paths.forEach(path => {
      ctx.beginPath();
      ctx.strokeStyle = path.completed 
        ? mode === 'dark' ? 'rgba(203, 213, 225, 0.15)' : 'rgba(15, 23, 42, 0.15)' // Slate-300 : Slate-900
        : mode === 'dark' ? 'rgba(203, 213, 225, 0.08)' : 'rgba(15, 23, 42, 0.08)';
      ctx.lineWidth = 1;

      path.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x * scaleX / dpr, point.y * scaleY / dpr);
        } else {
          ctx.lineTo(point.x * scaleX / dpr, point.y * scaleY / dpr);
        }
      });
      
      ctx.stroke();
    });
  }, [paths, showPaths, mode]);

  const calculateSinglePath = useCallback((startX: number, startY: number, startAngle: number): PathPoint[] => {
    const path: PathPoint[] = [];
    let x = startX;
    let y = startY;
    let angle = startAngle;
    const maxSteps = 2000; // Increased to match calculatePaths
    
    // Get canvas dimensions for bounds checking
    const canvas = canvasRef.current;
    if (!canvas) return path;
    
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    const margin = Math.max(canvasWidth, canvasHeight) * 0.2; // Same margin as calculatePaths
    
    let stuckCounter = 0;
    let lastX = x;
    let lastY = y;
    
    for (let step = 0; step < maxSteps; step++) {
      path.push({ x, y });
      
      if (Math.sqrt(Math.pow(goal.x - x, 2) + Math.pow(goal.y - y, 2)) < 15) {
        break;
      }
      
      const force = calculatePotentialField({ x, y });
      
      // Smooth turning like in updateCarPosition
      const targetAngle = Math.atan2(force.y, force.x);
      const turnSpeed = 0.08;
      const angleDiff = ((targetAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed);
      
      const normalizedSpeed = 2;
      const newX = x + Math.cos(angle) * normalizedSpeed;
      const newY = y + Math.sin(angle) * normalizedSpeed;
      
      // Check if stuck (not moving significantly)
      const movement = Math.sqrt(Math.pow(newX - lastX, 2) + Math.pow(newY - lastY, 2));
      if (movement < 0.1) {
        stuckCounter++;
        if (stuckCounter > 10) break; // Break if stuck for too long
      } else {
        stuckCounter = 0;
      }
      
      lastX = x;
      lastY = y;
      x = newX;
      y = newY;
      
      const hitObstacle = obstacles.some(obstacle => {
        const dx = x - obstacle.x;
        const dy = y - obstacle.y;
        return Math.sqrt(dx * dx + dy * dy) < obstacle.radius;
      });

      // Use same bounds checking as calculatePaths
      const outOfBounds = x < -margin || x > canvasWidth + margin || 
                         y < -margin || y > canvasHeight + margin;
      
      if (hitObstacle || outOfBounds) break;
    }
    
    return path;
  }, [calculatePotentialField, goal, obstacles]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Clear canvas with theme background
    ctx.fillStyle = mode === 'dark' ? '#1e293b' : '#ffffff'; // Slate-800 : White
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw potential field
    drawPotentialField(ctx);

    // Draw paths
    drawPaths(ctx);

    // Draw car's predicted path if enabled
    if (showCarPath) {
      const car = carRef.current;
      const carPath = calculateSinglePath(car.x, car.y, car.angle);
      
      ctx.beginPath();
      ctx.strokeStyle = mode === 'dark' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(220, 38, 38, 0.8)'; // Red-500 : Red-600
      ctx.lineWidth = 5;

      carPath.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x * scaleX / dpr, point.y * scaleY / dpr);
        } else {
          ctx.lineTo(point.x * scaleX / dpr, point.y * scaleY / dpr);
        }
      });
      
      ctx.stroke();
    }

    // Draw obstacles
    ctx.fillStyle = mode === 'dark' ? '#94a3b8' : '#64748b'; // Slate-400 : Slate-500
    obstacles.forEach(obstacle => {
      ctx.beginPath();
      ctx.arc(
        obstacle.x * scaleX / dpr, 
        obstacle.y * scaleY / dpr, 
        obstacle.radius * scaleX / dpr, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw goal
    ctx.fillStyle = hasReachedGoal 
      ? mode === 'dark' ? '#4ade80' : '#22c55e' // Green-400 : Green-500
      : mode === 'dark' ? '#86efac' : '#22c55e'; // Green-300 : Green-500
    ctx.beginPath();
    ctx.arc(
      goal.x * scaleX / dpr, 
      goal.y * scaleY / dpr, 
      10 * scaleX / dpr, 
      0, 
      Math.PI * 2
    );
    ctx.fill();

    // Draw car as arrow
    const car = carRef.current;
    drawArrow(
      ctx, 
      car.x * scaleX / dpr, 
      car.y * scaleY / dpr, 
      car.angle, 
      isSettingStart 
        ? mode === 'dark' ? '#60a5fa' : '#3b82f6' // Blue-400 : Blue-500
        : mode === 'dark' ? '#f87171' : '#ef4444' // Red-400 : Red-500
    );

    // Draw "Set starting position" message
    if (isSettingStart) {
      ctx.save();
      ctx.fillStyle = mode === 'dark' ? '#f8fafc' : '#0f172a'; // Slate-50 : Slate-900
      ctx.font = `${16 * scaleX / dpr}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText(
        'Click and drag to set starting position and heading', 
        canvas.width / 2, 
        30 * scaleY / dpr
      );
      ctx.restore();
    }
  }, [obstacles, goal, hasReachedGoal, isSettingStart, drawArrow, drawPotentialField, drawPaths, showCarPath, calculateSinglePath, mode]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSettingStart) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const x = (e.clientX - rect.left) * (canvas.width / rect.width / dpr)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height / dpr)

    carRef.current = { ...carRef.current, x, y }
    isDraggingRef.current = true
    draw()
  }, [isSettingStart, draw])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSettingStart || !isDraggingRef.current) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const x = (e.clientX - rect.left) * (canvas.width / rect.width / dpr)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height / dpr)
    
    const dx = x - carRef.current.x
    const dy = y - carRef.current.y
    const angle = Math.atan2(dy, dx)
    
    carRef.current = { ...carRef.current, angle }
    draw()
  }, [isSettingStart, draw])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const resetSimulation = useCallback(() => {
    carRef.current = { x: 50, y: 50, angle: 0, velocity: 0 }
    setHasReachedGoal(false)
    // Instead of calling draw directly, request an animation frame
    requestAnimationFrame(draw)
  }, [draw])

  const updateCarPosition = useCallback(() => {
    if (hasReachedGoal) return

    const car = carRef.current
    const distanceToGoal = Math.sqrt(
      Math.pow(goal.x - car.x, 2) + Math.pow(goal.y - car.y, 2)
    )
    
    if (distanceToGoal < 15) {
      setHasReachedGoal(true)
      setIsRunning(false)
      return
    }

    // Get force from potential field
    const force = calculatePotentialField({ x: car.x, y: car.y })
    
    // Calculate desired angle from force direction
    const targetAngle = Math.atan2(force.y, force.x)
    
    // Smooth turning
    const turnSpeed = 0.08
    const angleDiff = ((targetAngle - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    const newAngle = car.angle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed)

    // Calculate force magnitude for speed adjustment
    const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y)
    const maxForce = 5000 // Adjust based on your force scales
    const normalizedSpeed = speed * (1 / (1 + forceMagnitude / maxForce))

    // Update position
    const newX = car.x + Math.cos(newAngle) * normalizedSpeed
    const newY = car.y + Math.sin(newAngle) * normalizedSpeed

    carRef.current = {
      ...car,
      x: newX,
      y: newY,
      angle: newAngle
    }
  }, [calculatePotentialField, speed, hasReachedGoal, goal])

  const setupCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set the canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale the context to handle retina displays
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  const calculatePaths = useCallback(async () => {
    setIsCalculatingPaths(true);
    const newPaths: SimulationPath[] = [];
    const gridSize = 35; // Reduced for better coverage
    const maxSteps = 2000; // Increased to allow for much longer paths
    
    // Get actual canvas dimensions accounting for DPR
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsCalculatingPaths(false);
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Create a grid of starting points that covers the entire canvas plus margins
    const margin = Math.max(canvasWidth, canvasHeight) * 0.2; // Dynamic margin based on canvas size
    const startPoints: Array<{x: number, y: number}> = [];
    
    // Generate points in a radial pattern around the goal for better coverage
    const goalX = goal.x * (rect.width / canvas.width);
    const goalY = goal.y * (rect.height / canvas.height);
    const maxRadius = Math.sqrt(Math.pow(canvasWidth + margin * 2, 2) + Math.pow(canvasHeight + margin * 2, 2));
    const angleStep = Math.PI / 16; // Smaller angle step for more radial lines
    const radiusStep = gridSize; // Use gridSize as radius step
    
    // Add regular grid points
    for (let x = -margin; x <= canvasWidth + margin; x += gridSize) {
      for (let y = -margin; y <= canvasHeight + margin; y += gridSize) {
        // Convert screen coordinates to canvas coordinates
        const canvasX = x * (canvas.width / rect.width);
        const canvasY = y * (canvas.height / rect.height);
        startPoints.push({x: canvasX, y: canvasY});
      }
    }
    
    // Add radial points
    for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
      for (let r = 0; r <= maxRadius; r += radiusStep) {
        const screenX = goalX + r * Math.cos(angle);
        const screenY = goalY + r * Math.sin(angle);
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = screenX * (canvas.width / rect.width);
        const canvasY = screenY * (canvas.height / rect.height);
        
        // Only add points that are within our extended bounds
        if (canvasX >= -margin * (canvas.width / rect.width) && 
            canvasX <= (canvasWidth + margin) * (canvas.width / rect.width) && 
            canvasY >= -margin * (canvas.height / rect.height) && 
            canvasY <= (canvasHeight + margin) * (canvas.height / rect.height)) {
          startPoints.push({x: canvasX, y: canvasY});
        }
      }
    }
    
    // Process each starting point
    for (const {x: startX, y: startY} of startPoints) {
      // Skip if starting point is inside an obstacle
      const isInsideObstacle = obstacles.some(obstacle => {
        const dx = startX - obstacle.x;
        const dy = startY - obstacle.y;
        return Math.sqrt(dx * dx + dy * dy) < obstacle.radius + 5;
      });

      if (isInsideObstacle) continue;

      
      // Try multiple initial angles for each starting point
      const numAngles = randomizeHeading ? 1 : 4;
      for (let i = 0; i < numAngles; i++) {
        const path: PathPoint[] = [];
        let x = startX;
        let y = startY;
        let completed = false;
        
        // Set initial angle based on randomizeHeading setting or evenly distributed angles
        let angle = randomizeHeading 
          ? Math.random() * Math.PI * 2 
          : (Math.atan2(goal.y - y, goal.x - x) + (i * Math.PI / 2)) % (Math.PI * 2);
        
        let stuckCounter = 0;
        let lastX = x;
        let lastY = y;
        
        for (let step = 0; step < maxSteps; step++) {
          path.push({ x, y });
          
          // Check if reached goal
          if (Math.sqrt(Math.pow(goal.x - x, 2) + Math.pow(goal.y - y, 2)) < 15) {
            completed = true;
            break;
          }
          
          const force = calculatePotentialField({ x, y });
          
          // Smooth turning like in updateCarPosition
          const targetAngle = Math.atan2(force.y, force.x);
          const turnSpeed = 0.08;
          const angleDiff = ((targetAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed);
          
          const normalizedSpeed = 2;
          const newX = x + Math.cos(angle) * normalizedSpeed;
          const newY = y + Math.sin(angle) * normalizedSpeed;
          
          // Check if stuck (not moving significantly)
          const movement = Math.sqrt(Math.pow(newX - lastX, 2) + Math.pow(newY - lastY, 2));
          if (movement < 0.1) {
            stuckCounter++;
            if (stuckCounter > 10) break; // Break if stuck for too long
          } else {
            stuckCounter = 0;
          }
          
          lastX = x;
          lastY = y;
          x = newX;
          y = newY;
          
          // Check for collisions and bounds
          const hitObstacle = obstacles.some(obstacle => {
            const dx = x - obstacle.x;
            const dy = y - obstacle.y;
            return Math.sqrt(dx * dx + dy * dy) < obstacle.radius;
          });

          // Allow paths to extend far beyond canvas bounds
          const outOfBounds = x < -margin || x > canvasWidth + margin || 
                            y < -margin || y > canvasHeight + margin;
          
          if (hitObstacle || outOfBounds) break;
        }
        
        // Only add paths that have a minimum length and either reach the goal or travel a significant distance
        const minPathLength = 10;
        const significantDistance = 50;
        const distanceTraveled = path.length > 1 ? 
          Math.sqrt(Math.pow(path[path.length-1].x - path[0].x, 2) + 
                   Math.pow(path[path.length-1].y - path[0].y, 2)) : 0;
                   
        if (path.length > minPathLength && (completed || distanceTraveled > significantDistance)) {
          newPaths.push({ points: path, completed });
        }
      }
    }
    
    setPaths(newPaths);
    setShowPaths(true);
    setIsCalculatingPaths(false);
  }, [calculatePotentialField, obstacles, goal, randomizeHeading]);

  useEffect(() => {
    // Initial draw
    draw()
  }, [draw])

  useEffect(() => {
    if (!isRunning) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    let lastTime = 0
    const targetFrameRate = 60
    const frameInterval = 1000 / targetFrameRate

    function animate(currentTime: number) {
      if (!lastTime) lastTime = currentTime
      const deltaTime = currentTime - lastTime

      if (deltaTime >= frameInterval) {
        updateCarPosition()
        draw()
        lastTime = currentTime
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRunning, updateCarPosition, draw])

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      setupCanvas(canvas);
      draw(); // Redraw after setup
    }
  }, [setupCanvas, draw]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          minHeight: '100vh',
          backgroundColor: 'background.default',
          py: 2
        }}
      >
        <Container maxWidth={false}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Sidebar with controls */}
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                backgroundColor: 'background.paper', 
                borderRadius: 2,
                width: 320,
                flexShrink: 0,
                position: 'sticky',
                top: 16,
                alignSelf: 'flex-start',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto'
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Controls</Typography>
                  <IconButton onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} color="inherit">
                    {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                  </IconButton>
                </Box>
                
                {/* Position and Start/Stop controls */}
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={isSettingStart ? <Check /> : <GpsFixed />}
                  onClick={() => {
                    if (isSettingStart) {
                      setIsSettingStart(false)
                    } else if (!isRunning) {
                      resetSimulation()
                      setIsSettingStart(true)
                    }
                    setIsRunning(false)
                  }}
                  color={isSettingStart ? "success" : "primary"}
                >
                  {isSettingStart ? 'Confirm Position' : 'Set Position'}
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={isRunning ? <Stop /> : <PlayArrow />}
                  onClick={() => setIsRunning(!isRunning)}
                  disabled={isSettingStart}
                  color={isRunning ? "error" : "success"}
                >
                  {isRunning ? 'Stop' : 'Start'}
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => setShowField(!showField)}
                  color="secondary"
                >
                  {showField ? 'Hide Field' : 'Show Field'}
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => setShowFieldMagnitude(!showFieldMagnitude)}
                  color="secondary"
                  disabled={!showField}
                >
                  {showFieldMagnitude ? 'Show Components' : 'Show Magnitude'}
                </Button>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        checked={randomizeHeading}
                        onChange={(e) => setRandomizeHeading(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="body2">Random Heading</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        checked={showCarPath}
                        onChange={(e) => setShowCarPath(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="body2">Show Car Path</Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (!showPaths) {
                        calculatePaths();
                      } else {
                        setShowPaths(false);
                      }
                    }}
                    color="secondary"
                    disabled={isCalculatingPaths}
                    size="small"
                  >
                    {isCalculatingPaths ? 'Calculating...' : (showPaths ? 'Hide Paths' : 'Show Paths')}
                  </Button>
                </Stack>

                <Divider sx={{ my: 1 }} />

                {/* Speed control */}
                <Box sx={{ 
                  backgroundColor: 'background.paper',
                  p: 2,
                  borderRadius: 1
                }}>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <SpeedIcon color="primary" />
                      <Typography>Speed</Typography>
                    </Stack>
                    <Slider
                      value={speed}
                      onChange={(_, value) => setSpeed(value as number)}
                      min={1}
                      max={5}
                      step={0.5}
                      valueLabelDisplay="auto"
                    />
                  </Stack>
                </Box>

                {/* Goal Attraction control */}
                <Box sx={{ 
                  backgroundColor: 'background.paper',
                  p: 2,
                  borderRadius: 1
                }}>
                  <Stack spacing={1}>
                    <Typography>Goal Attraction</Typography>
                    <Slider
                      value={goalWeight}
                      onChange={(_, value) => setGoalWeight(value as number)}
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      valueLabelDisplay="auto"
                    />
                  </Stack>
                </Box>

                {/* Obstacle Repulsion control */}
                <Box sx={{ 
                  backgroundColor: 'background.paper',
                  p: 2,
                  borderRadius: 1
                }}>
                  <Stack spacing={1}>
                    <Typography>Obstacle Repulsion</Typography>
                    <Slider
                      value={obstacleWeight}
                      onChange={(_, value) => setObstacleWeight(value as number)}
                      min={1000}
                      max={5000}
                      step={100}
                      valueLabelDisplay="auto"
                    />
                  </Stack>
                </Box>

                {/* Arrow Scale control */}
                <Box sx={{ 
                  backgroundColor: 'background.paper',
                  p: 2,
                  borderRadius: 1
                }}>
                  <Stack spacing={1}>
                    <Typography>Arrow Scale</Typography>
                    <Slider
                      value={arrowScale}
                      onChange={(_, value) => setArrowScale(value as number)}
                      min={0.5}
                      max={3.0}
                      step={0.1}
                      valueLabelDisplay="auto"
                    />
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            {/* Main content area */}
            <Stack spacing={2} sx={{ flex: 1 }}>
              {hasReachedGoal && (
                <Alert 
                  severity="success" 
                  sx={{ 
                    backgroundColor: 'success.light',
                    color: 'success.dark'
                  }}
                >
                  Goal reached successfully!
                </Alert>
              )}

              <Paper 
                elevation={3}
                sx={{ 
                  p: 1, 
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                  height: 'calc(100vh - 32px)'
                }}
              >
                <canvas 
                  ref={canvasRef}
                  style={{ 
                    cursor: isSettingStart ? 'crosshair' : 'default',
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </Paper>
            </Stack>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
