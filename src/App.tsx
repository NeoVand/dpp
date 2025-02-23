import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Container,
  Paper,
  Slider,
  Typography,
  ThemeProvider,
  createTheme,
  Stack,
  Checkbox,
  IconButton,
  useMediaQuery,
  CssBaseline,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel as MuiFormControlLabel,
  Radio
} from '@mui/material'
import {
  PlayArrow,
  Stop,
  Speed as SpeedIcon,
  Brightness4,
  Brightness7,
  ExpandMore,
  Settings as SettingsIcon,
  Animation as AnimationIcon,
  GridOn as GridIcon,
  Science as ScienceIcon,
  Route as PathIcon,
  Refresh as RefreshIcon,
  Brush as BrushIcon
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
  angle?: number;
}

interface SimulationPath {
  points: PathPoint[];
  completed: boolean;
}

interface DragState {
  type: 'car' | 'goal' | 'rotation' | null;
  initialX: number;
  initialY: number;
  initialAngle?: number;
  centerX?: number;
  centerY?: number;
  lastUpdate?: number;
}

// Add path parameters interface
interface PathParameters {
  gridSize: number;
  maxSteps: number;
  minPathLength: number;
  significantDistance: number;
  numAnglesPerPoint: number;
  marginScale: number;
  directionThreshold: number; // Angle threshold in radians for direction matching
  positionThreshold: number; // Distance threshold for position matching
}

// Update the WorldInitialization interface
interface WorldInitialization {
  method: 'random' | 'uniform' | 'custom';
  numObstacles: number;
  seed: number;
  minRadius: number;
  maxRadius: number;
  brushSize: number; // Add brush size for custom painting
}

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light')
  const [goalType, setGoalType] = useState<'position' | 'direction'>('position')
  const [goal, setGoal] = useState({ x: 400, y: 300, angle: 0 }) // Added angle property

  // Update the initial state
  const [worldInit, setWorldInit] = useState<WorldInitialization>({
    method: 'random',
    numObstacles: 10,
    seed: Math.floor(Math.random() * 1000000),
    minRadius: 15,
    maxRadius: 35,
    brushSize: 20 // Default brush size
  })

  // Add path parameters state
  const [pathParams, setPathParams] = useState<PathParameters>({
    gridSize: 40,
    maxSteps: 200,
    minPathLength: 10,
    significantDistance: 100,
    numAnglesPerPoint: 4,
    marginScale: 0.1,
    directionThreshold: Math.PI / 6, // Default 30 degrees threshold
    positionThreshold: 15 // Default 15px threshold
  })
  
  // Add auto-update paths state
  const [autoUpdatePaths, setAutoUpdatePaths] = useState(true)

  // Helper function to check if a point is within a circle
  const isPointInCircle = (px: number, py: number, cx: number, cy: number, radius: number) => {
    const dx = px - cx
    const dy = py - cy
    return dx * dx + dy * dy <= radius * radius
  }

  // Helper function to get canvas coordinates
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const x = (e.clientX - rect.left) * (canvas.width / rect.width / dpr)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height / dpr)
    return { x, y }
  }, [])

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#94a3b8' : '#475569',
        light: mode === 'dark' ? '#cbd5e1' : '#94a3b8',
        dark: mode === 'dark' ? '#64748b' : '#334155',
      },
      secondary: {
        main: mode === 'dark' ? '#93c5fd' : '#3b82f6',
        light: mode === 'dark' ? '#bfdbfe' : '#60a5fa',
        dark: mode === 'dark' ? '#60a5fa' : '#2563eb',
      },
      success: {
        main: mode === 'dark' ? '#86efac' : '#22c55e',
        light: mode === 'dark' ? '#bbf7d0' : '#4ade80',
        dark: mode === 'dark' ? '#4ade80' : '#16a34a',
      },
      error: {
        main: mode === 'dark' ? '#fca5a5' : '#ef4444',
        light: mode === 'dark' ? '#fecaca' : '#f87171',
        dark: mode === 'dark' ? '#f87171' : '#dc2626',
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8fafc',
        paper: mode === 'dark' ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f8fafc' : '#0f172a',
        secondary: mode === 'dark' ? '#cbd5e1' : '#475569',
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
      MuiAccordion: {
        styleOverrides: {
          root: {
            '&:before': {
              display: 'none',
            },
            boxShadow: 'none',
            borderRadius: '8px',
            '&:first-of-type': {
              borderRadius: '8px',
            },
            '&:last-of-type': {
              borderRadius: '8px',
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 48,
            '&.Mui-expanded': {
              minHeight: 48,
            },
          },
          content: {
            margin: '8px 0',
            '&.Mui-expanded': {
              margin: '8px 0',
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: '8px 16px 16px',
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            padding: '8px 0',
          },
          thumb: {
            width: 16,
            height: 16,
          },
          track: {
            height: 4,
          },
          rail: {
            height: 4,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            padding: '6px 16px',
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
          },
          h6: {
            fontSize: '1rem',
          },
          subtitle1: {
            fontSize: '0.875rem',
          },
          subtitle2: {
            fontSize: '0.8125rem',
          },
          body1: {
            fontSize: '0.875rem',
          },
          body2: {
            fontSize: '0.8125rem',
          },
        },
      },
    },
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const carRef = useRef<Car>({
    x: 100 + Math.random() * (window.innerWidth - 200),
    y: 100 + Math.random() * (window.innerHeight - 200),
    angle: Math.random() * Math.PI * 2,
    velocity: 0
  })
  const [obstacles, setObstacles] = useState<Obstacle[]>(() => generateRandomObstacles(worldInit))
  const animationFrameRef = useRef<number | undefined>(undefined)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [hasReachedGoal, setHasReachedGoal] = useState(false)
  const [showField, setShowField] = useState(false)
  const [goalWeight, setGoalWeight] = useState(0.5)
  const [obstacleWeight, setObstacleWeight] = useState(3000.0)
  const [arrowScale, setArrowScale] = useState(1.0)
  const [arrowThickness, setArrowThickness] = useState(1.5)
  const [arrowheadSize, setArrowheadSize] = useState(1.0)
  const [showFieldMagnitude, setShowFieldMagnitude] = useState(false)
  const [showPaths, setShowPaths] = useState(true)
  const [paths, setPaths] = useState<SimulationPath[]>([])
  const [isCalculatingPaths, setIsCalculatingPaths] = useState(false)
  const [randomizeHeading, setRandomizeHeading] = useState(true)
  const [showCarPath, setShowCarPath] = useState(false)
  const [selectedObject, setSelectedObject] = useState<'car' | 'goal' | null>(null)
  const dragStateRef = useRef<DragState>({ type: null, initialX: 0, initialY: 0 })
  const [isDrawingObstacle, setIsDrawingObstacle] = useState(false)
  const [paintMode, setPaintMode] = useState<'none' | 'paint' | 'erase'>('none')
  const [cursorPreview, setCursorPreview] = useState<{ x: number; y: number } | null>(null)

  // Add debounced cursor preview update

  // Update the generateRandomObstacles function
  function generateRandomObstacles(params: WorldInitialization): Obstacle[] {
    const obstacles: Obstacle[] = []
    const canvas = canvasRef.current
    if (!canvas) return obstacles

    const rect = canvas.getBoundingClientRect()
    const margin = 50 // Minimum distance from edges
    const width = rect.width - 2 * margin
    const height = rect.height - 2 * margin

    // Use seeded random number generator
    const random = (() => {
      let seed = params.seed
      return () => {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
      }
    })()

    // Helper function to check if a new obstacle overlaps with existing ones
    const isValidPosition = (x: number, y: number, radius: number) => {
      // Check distance from edges
      if (x - radius < margin || x + radius > rect.width - margin ||
          y - radius < margin || y + radius > rect.height - margin) {
        return false
      }

      // Check overlap with existing obstacles (with minimum spacing)
      const spacing = 10 // Minimum space between obstacles
      return !obstacles.some(obs => {
        const dx = obs.x - x
        const dy = obs.y - y
        const minDist = obs.radius + radius + spacing
        return dx * dx + dy * dy < minDist * minDist
      })
    }

    // Try to place obstacles with maximum attempts
    const maxAttempts = 100
    for (let i = 0; i < params.numObstacles; i++) {
      let placed = false
      let attempts = 0

      while (!placed && attempts < maxAttempts) {
        const radius = params.minRadius + random() * (params.maxRadius - params.minRadius)
        const x = margin + random() * width
        const y = margin + random() * height

        if (isValidPosition(x, y, radius)) {
          obstacles.push({ x, y, radius })
          placed = true
        }
        attempts++
      }

      if (!placed) {
        console.warn(`Could not place obstacle ${i + 1} after ${maxAttempts} attempts`)
      }
    }

    return obstacles
  }

  const drawArrow = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    scale: number = 1
  ) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.scale(scale, scale)

    // Draw arrow
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    // Draw triangle
    ctx.beginPath()
    ctx.moveTo(15, 0)
    ctx.lineTo(-7.5, -7.5)
    ctx.lineTo(-7.5, 7.5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }, [])

  const calculatePotentialField = useCallback((position: Vector2D): Force => {
    // Initialize total force
    let totalForce: Force = { x: 0, y: 0 };
    
    // Calculate attractive force (F_att = -k_att * (q - q_goal))
    const dx = position.x - goal.x;
    const dy = position.y - goal.y;
    const distToGoal = Math.sqrt(dx * dx + dy * dy);
    
    // Attractive force - linear for better behavior at long distances
    totalForce.x = -goalWeight * dx / Math.max(distToGoal, 0.1);
    totalForce.y = -goalWeight * dy / Math.max(distToGoal, 0.1);
    
    // Calculate repulsive forces from all obstacles
    obstacles.forEach(obstacle => {
      const dx = position.x - obstacle.x;
      const dy = position.y - obstacle.y;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      const rho = Math.max(0.1, distToCenter - obstacle.radius); // Distance to surface
      const rho_0 = obstacle.radius * 4;
      
      // Only apply repulsive force if within influence distance
      if (rho <= rho_0) {
        // Calculate repulsive force magnitude
        const magnitude = obstacleWeight * (1/rho - 1/rho_0) / (rho * rho);
        
        // Add repulsive force to total
        totalForce.x += magnitude * dx / distToCenter;
        totalForce.y += magnitude * dy / distToCenter;
      }
    });
    
    return totalForce;
  }, [obstacles, goal, goalWeight, obstacleWeight]);

  const drawPotentialField = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showField) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const visualResolution = pathParams.gridSize;
    
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
        
        // Normalize and scale the force vector (only affects length)
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
        const alpha = 0.8;
        
        if (showFieldMagnitude) {
          const color = mode === 'dark' ? '147, 197, 253' : '59, 130, 246';
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.strokeStyle = ctx.fillStyle;
        } else {
          const absX = Math.abs(force.x);
          const absY = Math.abs(force.y);
          const total = absX + absY;
          if (mode === 'dark') {
            const r = Math.floor(252 * (absY / total));
            const b = Math.floor(252 * (absX / total));
            ctx.fillStyle = `rgba(${r}, 165, ${b}, ${alpha})`;
          } else {
            const r = Math.floor(220 * (absY / total));
            const b = Math.floor(220 * (absX / total));
            ctx.fillStyle = `rgba(${r}, 40, ${b}, ${alpha})`;
          }
          ctx.strokeStyle = ctx.fillStyle;
        }
        
        // Draw arrow line with fixed thickness
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLength, 0);
        ctx.lineWidth = arrowThickness;
        ctx.stroke();
        
        // Draw arrow head with configurable size
        const baseHeadLength = 6;
        const headLength = baseHeadLength * arrowheadSize;
        const headWidth = headLength * 0.8;
        ctx.beginPath();
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(arrowLength - headLength, headWidth);
        ctx.lineTo(arrowLength - headLength, -headWidth);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }
  }, [calculatePotentialField, showField, pathParams.gridSize, obstacles, obstacleWeight, arrowScale, arrowThickness, arrowheadSize, showFieldMagnitude, mode]);

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

  const calculatePaths = useCallback(async () => {
    setIsCalculatingPaths(true);
    const newPaths: SimulationPath[] = [];
    const {
      gridSize,
      maxSteps,
      minPathLength,
      significantDistance,
      numAnglesPerPoint,
      marginScale
    } = pathParams;
    
    // Get actual canvas dimensions
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsCalculatingPaths(false);
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    const margin = Math.max(canvasWidth, canvasHeight) * marginScale;

    // Focus on important areas: near car, near goal, and some grid points
    const startPoints: Array<{x: number, y: number}> = [];
    const car = carRef.current;
    
    // Add points around car and goal
    [{ x: car.x, y: car.y }, { x: goal.x, y: goal.y }].forEach(center => {
      for (let r = 0; r <= gridSize * 4; r += gridSize) {
        const angleStep = r === 0 ? Math.PI * 2 : Math.PI / 4;
        for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
          const x = center.x + r * Math.cos(angle);
          const y = center.y + r * Math.sin(angle);
          
          // Skip if too close to obstacles
          const tooClose = obstacles.some(obs => {
            const dx = x - obs.x;
            const dy = y - obs.y;
            return dx * dx + dy * dy < (obs.radius + 5) * (obs.radius + 5);
          });
          
          if (!tooClose) {
            startPoints.push({ x, y });
          }
        }
      }
    });
    
    // Add sparse grid points
    const gridStep = gridSize * 2;
    for (let x = 0; x < canvasWidth; x += gridStep) {
      for (let y = 0; y < canvasHeight; y += gridStep) {
        const tooClose = obstacles.some(obs => {
          const dx = x - obs.x;
          const dy = y - obs.y;
          return dx * dx + dy * dy < (obs.radius + 5) * (obs.radius + 5);
        });
        
        if (!tooClose) {
          startPoints.push({ x, y });
        }
      }
    }

    // Process paths
    const processPath = (startX: number, startY: number, initialAngle: number) => {
      const path: PathPoint[] = [];
      let x = startX;
      let y = startY;
      let angle = initialAngle;
      let completed = false;
      let stuckCounter = 0;
      
      for (let step = 0; step < maxSteps; step++) {
        path.push({ x, y, angle });
        
        const distToGoal = Math.hypot(goal.x - x, goal.y - y);
        if (distToGoal < 15) {
          // Check direction matching if needed
          if (goalType === 'direction') {
            const angleDiff = Math.abs(((goal.angle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            completed = angleDiff <= pathParams.directionThreshold;
          } else {
            completed = true;
          }
          if (completed) break;
        }
        
        const force = calculatePotentialField({ x, y });
        const targetAngle = Math.atan2(force.y, force.x);
        const angleDiff = ((targetAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.08);
        
        const newX = x + Math.cos(angle) * 2;
        const newY = y + Math.sin(angle) * 2;
        
        if (Math.abs(newX - x) < 0.1 && Math.abs(newY - y) < 0.1) {
          if (++stuckCounter > 5) break;
        } else {
          stuckCounter = 0;
        }
        
        // Quick bounds and obstacle check
        if (newX < -margin || newX > canvasWidth + margin || 
            newY < -margin || newY > canvasHeight + margin ||
            obstacles.some(obs => {
              const dx = newX - obs.x;
              const dy = newY - obs.y;
              return dx * dx + dy * dy < obs.radius * obs.radius;
            })) {
          break;
        }
        
        x = newX;
        y = newY;
      }
      
      const distanceTraveled = path.length > 1 ? 
        Math.hypot(path[path.length-1].x - path[0].x, path[path.length-1].y - path[0].y) : 0;
      
      if (path.length > minPathLength && (completed || distanceTraveled > significantDistance)) {
        newPaths.push({ points: path, completed });
      }
    };

    // Process all start points
    startPoints.forEach(point => {
      if (randomizeHeading) {
        processPath(point.x, point.y, Math.random() * Math.PI * 2);
      } else {
        const baseAngle = Math.atan2(goal.y - point.y, goal.x - point.x);
        for (let i = 0; i < numAnglesPerPoint; i++) {
          processPath(point.x, point.y, baseAngle + (i * Math.PI / numAnglesPerPoint));
        }
      }
    });

    setPaths(newPaths);
    setShowPaths(true);
    setIsCalculatingPaths(false);
  }, [calculatePotentialField, obstacles, goal, randomizeHeading, pathParams]);

  // Update the auto-update paths effect
  useEffect(() => {
    if (autoUpdatePaths && !isRunning && !isCalculatingPaths) {
      calculatePaths();
    }
  }, [autoUpdatePaths, calculatePaths, goal, carRef.current.x, carRef.current.y, isRunning, isCalculatingPaths]);

  // Add the calculateSinglePath function before the draw function
  const calculateSinglePath = useCallback((startX: number, startY: number, startAngle: number): PathPoint[] => {
    const path: PathPoint[] = [];
    let x = startX;
    let y = startY;
    let angle = startAngle;
    let stuckCounter = 0;
    
    const canvas = canvasRef.current;
    if (!canvas) return path;
    
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    const margin = Math.max(canvasWidth, canvasHeight) * pathParams.marginScale;
    
    for (let step = 0; step < pathParams.maxSteps; step++) {
      path.push({ x, y, angle });
      
      if (Math.hypot(goal.x - x, goal.y - y) < 15) {
        break;
      }
      
      const force = calculatePotentialField({ x, y });
      const targetAngle = Math.atan2(force.y, force.x);
      const angleDiff = ((targetAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.08);
      
      const newX = x + Math.cos(angle) * 2;
      const newY = y + Math.sin(angle) * 2;
      
      if (Math.abs(newX - x) < 0.1 && Math.abs(newY - y) < 0.1) {
        if (++stuckCounter > 5) break;
      } else {
        stuckCounter = 0;
      }
      
      // Quick bounds and obstacle check
      if (newX < -margin || newX > canvasWidth + margin || 
          newY < -margin || newY > canvasHeight + margin ||
          obstacles.some(obs => {
            const dx = newX - obs.x;
            const dy = newY - obs.y;
            return dx * dx + dy * dy < obs.radius * obs.radius;
          })) {
        break;
      }
      
      x = newX;
      y = newY;
    }
    
    return path;
  }, [calculatePotentialField, goal, obstacles, pathParams]);

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

      carPath.forEach((point: PathPoint, index: number) => {
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
    if (goalType === 'position') {
      ctx.fillStyle = hasReachedGoal 
        ? mode === 'dark' ? '#4ade80' : '#22c55e' // Green-400 : Green-500
        : mode === 'dark' ? '#86efac' : '#22c55e'; // Green-300 : Green-500
      ctx.strokeStyle = mode === 'dark' ? '#4ade80' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        goal.x * scaleX / dpr, 
        goal.y * scaleY / dpr, 
        10 * scaleX / dpr, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    } else {
      // Draw directional goal as green arrow
      drawArrow(
        ctx,
        goal.x * scaleX / dpr,
        goal.y * scaleY / dpr,
        goal.angle,
        hasReachedGoal 
          ? mode === 'dark' ? '#4ade80' : '#22c55e' // Green-400 : Green-500
          : mode === 'dark' ? '#86efac' : '#22c55e', // Green-300 : Green-500
        1.2
      );
    }

    // Draw car as arrow
    const car = carRef.current;
    drawArrow(
      ctx, 
      car.x * scaleX / dpr, 
      car.y * scaleY / dpr, 
      car.angle, 
      selectedObject === 'car' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(220, 38, 38, 0.8)'
    );

    // Draw car selection UI when selected
    if (selectedObject === 'car') {
      ctx.save()
      
      // Draw selection circle
      ctx.strokeStyle = mode === 'dark' ? '#60a5fa' : '#3b82f6' // Blue-400 : Blue-500
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(
        car.x * scaleX / dpr,
        car.y * scaleY / dpr,
        25 * scaleX / dpr,
        0,
        Math.PI * 2
      )
      ctx.stroke()
      
      // Draw rotation handle
      const handleRadius = 30
      const handleX = car.x + Math.cos(car.angle) * handleRadius
      const handleY = car.y + Math.sin(car.angle) * handleRadius
      
      // Draw handle line
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(car.x * scaleX / dpr, car.y * scaleY / dpr)
      ctx.lineTo(handleX * scaleX / dpr, handleY * scaleY / dpr)
      ctx.stroke()
      
      // Draw handle circle
      ctx.fillStyle = mode === 'dark' ? '#60a5fa' : '#3b82f6'
      ctx.beginPath()
      ctx.arc(
        handleX * scaleX / dpr,
        handleY * scaleY / dpr,
        8 * scaleX / dpr,
        0,
        Math.PI * 2
      )
      ctx.fill()
      
      ctx.restore()
    }

    // Draw goal selection UI when selected
    if (selectedObject === 'goal') {
      ctx.save();
      ctx.strokeStyle = mode === 'dark' ? '#86efac' : '#22c55e'; // Green-300 : Green-500
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(
        goal.x * scaleX / dpr,
        goal.y * scaleY / dpr,
        20 * scaleX / dpr,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Add rotation handle for directional goal
      if (goalType === 'direction') {
        const handleRadius = 30;
        const handleX = goal.x + Math.cos(goal.angle) * handleRadius;
        const handleY = goal.y + Math.sin(goal.angle) * handleRadius;
        
        // Draw handle line
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(goal.x * scaleX / dpr, goal.y * scaleY / dpr);
        ctx.lineTo(handleX * scaleX / dpr, handleY * scaleY / dpr);
        ctx.stroke();
        
        // Draw handle circle
        ctx.fillStyle = mode === 'dark' ? '#86efac' : '#22c55e';
        ctx.beginPath();
        ctx.arc(
          handleX * scaleX / dpr,
          handleY * scaleY / dpr,
          8 * scaleX / dpr,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      
      ctx.restore();
    }

    // Draw cursor preview if in paint mode with optimized check
    if (paintMode !== 'none' && cursorPreview && !isDrawingObstacle) {
      ctx.save();
      ctx.strokeStyle = mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(
        cursorPreview.x * scaleX / dpr,
        cursorPreview.y * scaleY / dpr,
        worldInit.brushSize * scaleX / dpr,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }, [obstacles, goal, hasReachedGoal, selectedObject, drawArrow, drawPotentialField, drawPaths, showCarPath, calculateSinglePath, mode, paintMode, cursorPreview, worldInit.brushSize, isDrawingObstacle]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y } = coords;

    // If in paint or erase mode and not running, handle obstacle painting or erasing
    if (paintMode !== 'none' && !isRunning) {
      setIsDrawingObstacle(true);
      if (paintMode === 'erase') {
        // Remove obstacles that intersect with the eraser
        setObstacles(prev => prev.filter(obs => {
          const dx = x - obs.x;
          const dy = y - obs.y;
          const minDist = obs.radius + worldInit.brushSize;
          return dx * dx + dy * dy > minDist * minDist / 4;
        }));
      } else {
        // Add new obstacle at click position
        setObstacles(prev => [...prev, {
          x,
          y,
          radius: worldInit.brushSize
        }]);
      }
      return;
    }

    // Check if clicking on car (only allow car movement when not running)
    const car = carRef.current;
    if (!isRunning && isPointInCircle(x, y, car.x, car.y, 20)) {
      setSelectedObject('car');
      dragStateRef.current = { 
        type: 'car', 
        initialX: x - car.x, 
        initialY: y - car.y 
      };
      return;
    }

    // Check if clicking on car's rotation handle (only when car is selected and not running)
    if (!isRunning && selectedObject === 'car') {
      const handleRadius = 30
      const handleX = car.x + Math.cos(car.angle) * handleRadius
      const handleY = car.y + Math.sin(car.angle) * handleRadius
      if (isPointInCircle(x, y, handleX, handleY, 10)) {
        dragStateRef.current = {
          type: 'rotation',
          initialX: x,
          initialY: y,
          initialAngle: car.angle,
          centerX: car.x,
          centerY: car.y
        }
        return
      }
    }

    // Check if clicking on goal's rotation handle
    if (selectedObject === 'goal' && goalType === 'direction') {
      const handleRadius = 30;
      const handleX = goal.x + Math.cos(goal.angle) * handleRadius;
      const handleY = goal.y + Math.sin(goal.angle) * handleRadius;
      if (isPointInCircle(x, y, handleX, handleY, 10)) {
        dragStateRef.current = {
          type: 'rotation',
          initialX: x,
          initialY: y,
          initialAngle: goal.angle,
          centerX: goal.x,
          centerY: goal.y
        };
        return;
      }
    }

    // Check if clicking on goal (always allowed)
    if (isPointInCircle(x, y, goal.x, goal.y, 15)) {
      setSelectedObject('goal');
      dragStateRef.current = { 
        type: 'goal', 
        initialX: x - goal.x, 
        initialY: y - goal.y 
      };
      return;
    }

    // If clicked elsewhere, clear selection
    setSelectedObject(null);
  }, [isRunning, goal, selectedObject, getCanvasCoordinates, paintMode, worldInit.brushSize]);

  // Optimize cursor preview updates
  const [lastDrawTime, setLastDrawTime] = useState(0);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y } = coords;

    // Update cursor preview position in paint mode with throttling
    if (paintMode !== 'none') {
      const now = Date.now();
      if (now - lastDrawTime > 16) { // ~60fps
        setCursorPreview({ x, y });
        setLastDrawTime(now);
      }
    } else {
      setCursorPreview(null);
    }

    // Handle obstacle painting/erasing with throttling
    if (isDrawingObstacle && paintMode !== 'none') {
      const now = Date.now();
      if (now - lastDrawTime > 32) { // ~30fps for painting
        if (paintMode === 'erase') {
          // Remove obstacles that intersect with the eraser
          setObstacles(prev => prev.filter(obs => {
            const dx = x - obs.x;
            const dy = y - obs.y;
            const minDist = obs.radius + worldInit.brushSize;
            return dx * dx + dy * dy > minDist * minDist / 4;
          }));
        } else {
          // Check if we're too close to any existing obstacle
          const tooClose = obstacles.some(obs => {
            const dx = x - obs.x;
            const dy = y - obs.y;
            const minDist = obs.radius + worldInit.brushSize;
            return dx * dx + dy * dy < minDist * minDist / 4;
          });

          if (!tooClose) {
            setObstacles(prev => [...prev, {
              x,
              y,
              radius: worldInit.brushSize
            }]);
          }
        }
        setLastDrawTime(now);
      }
      return;
    }

    const dragState = dragStateRef.current;
    if (dragState.type === 'car' && !isRunning) {
      setHasReachedGoal(false);
      carRef.current = {
        ...carRef.current,
        x: x - dragState.initialX,
        y: y - dragState.initialY
      };
      draw();
    } else if (dragState.type === 'goal') {
      setHasReachedGoal(false);
      const newGoal = {
        ...goal,
        x: x - dragState.initialX,
        y: y - dragState.initialY
      };
      
      // Update goal position immediately for smooth dragging
      setGoal(newGoal);
      draw();
      
      // Debounce path updates with a longer interval
      if (showPaths && autoUpdatePaths) {
        const now = Date.now();
        if (!dragState.lastUpdate || now - dragState.lastUpdate > 250) {
          calculatePaths();
          dragState.lastUpdate = now;
        }
      }
    } else if (dragState.type === 'rotation' && !isRunning && dragState.centerX !== undefined && dragState.centerY !== undefined) {
      setHasReachedGoal(false);
      const angle = Math.atan2(
        y - dragState.centerY,
        x - dragState.centerX
      );
      if (selectedObject === 'car') {
        carRef.current = {
          ...carRef.current,
          angle
        };
      } else if (selectedObject === 'goal' && goalType === 'direction') {
        setGoal(prev => ({
          ...prev,
          angle
        }));
      }
      draw();
    }

    // Update cursor based on hover state
    const car = carRef.current;
    const isOverCar = isPointInCircle(x, y, car.x, car.y, 20);
    const isOverGoal = isPointInCircle(x, y, goal.x, goal.y, 15);
    
    if (dragState.type === 'rotation') {
      e.currentTarget.style.cursor = 'grabbing';
    } else if ((isOverCar && !isRunning) || isOverGoal) {
      e.currentTarget.style.cursor = dragState.type ? 'grabbing' : 'grab';
    } else if (selectedObject === 'car' && !isRunning) {
      const handleRadius = 30;
      const handleX = car.x + Math.cos(car.angle) * handleRadius;
      const handleY = car.y + Math.sin(car.angle) * handleRadius;
      const isOverHandle = isPointInCircle(x, y, handleX, handleY, 10);
      e.currentTarget.style.cursor = isOverHandle ? 'pointer' : 'default';
    } else if (selectedObject === 'goal' && goalType === 'direction') {
      const handleRadius = 30;
      const handleX = goal.x + Math.cos(goal.angle) * handleRadius;
      const handleY = goal.y + Math.sin(goal.angle) * handleRadius;
      const isOverHandle = isPointInCircle(x, y, handleX, handleY, 10);
      e.currentTarget.style.cursor = isOverHandle ? 'pointer' : 'default';
    } else {
      e.currentTarget.style.cursor = 'default';
    }
  }, [draw, goal, selectedObject, isRunning, getCanvasCoordinates, paintMode, worldInit.brushSize]);

  const handleMouseUp = useCallback(() => {
    setIsDrawingObstacle(false);
    dragStateRef.current = { type: null, initialX: 0, initialY: 0 };
  }, []);

  const updateCarPosition = useCallback(() => {
    if (hasReachedGoal) return;

    const car = carRef.current;
    const distanceToGoal = Math.sqrt(
      Math.pow(goal.x - car.x, 2) + Math.pow(goal.y - car.y, 2)
    );
    
    // Get force from potential field
    const force = calculatePotentialField({ x: car.x, y: car.y });
    
    // Calculate desired angle from force direction
    const targetAngle = Math.atan2(force.y, force.x);
    
    // Calculate angle difference for both force direction and goal direction
    const forceAngleDiff = ((targetAngle - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    
    let angleToTurn = forceAngleDiff;
    const turnSpeed = 0.08;

    // If we're close to the goal and in direction mode, consider goal's direction
    if (distanceToGoal < pathParams.positionThreshold * 2 && goalType === 'direction') {
      const goalAngleDiff = ((goal.angle - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      // Blend between force direction and goal direction based on distance
      const blend = Math.max(0, Math.min(1, (pathParams.positionThreshold * 2 - distanceToGoal) / pathParams.positionThreshold));
      angleToTurn = forceAngleDiff * (1 - blend) + goalAngleDiff * blend;
    }

    const newAngle = car.angle + Math.sign(angleToTurn) * Math.min(Math.abs(angleToTurn), turnSpeed);

    // Calculate force magnitude for speed adjustment
    const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y);
    const maxForce = 5000; // Adjust based on your force scales
    const normalizedSpeed = speed * (1 / (1 + forceMagnitude / maxForce));

    // Update position
    const newX = car.x + Math.cos(newAngle) * normalizedSpeed;
    const newY = car.y + Math.sin(newAngle) * normalizedSpeed;

    carRef.current = {
      ...car,
      x: newX,
      y: newY,
      angle: newAngle
    };

    // Check if goal is reached
    if (distanceToGoal < pathParams.positionThreshold) {
      if (goalType === 'direction') {
        const finalAngleDiff = Math.abs(((goal.angle - newAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (finalAngleDiff <= pathParams.directionThreshold) {
          setHasReachedGoal(true);
          setIsRunning(false);
        }
      } else {
        setHasReachedGoal(true);
        setIsRunning(false);
      }
    }
  }, [calculatePotentialField, speed, hasReachedGoal, goal, goalType, pathParams]);

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

  useEffect(() => {
    // Calculate paths on mount if showPaths is true
    if (showPaths && !isCalculatingPaths) {
      calculatePaths();
    }
  }, []); // Empty dependency array means this runs once on mount

  // Update PaintControls component
  const PaintControls = () => {
    const sliderRef = useRef<HTMLDivElement>(null);

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(241, 245, 249, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: 2,
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          alignItems: 'center',
          zIndex: 1000,
          border: 1,
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Stack direction="column" spacing={1}>
          <IconButton
            onClick={() => setPaintMode(prev => prev === 'paint' ? 'none' : 'paint')}
            sx={{
              backgroundColor: paintMode === 'paint' ? 'primary.main' : 'transparent',
              '&:hover': {
                backgroundColor: paintMode === 'paint' ? 'primary.dark' : 'rgba(255, 255, 255, 0.1)',
              },
              width: 40,
              height: 40,
            }}
          >
            <BrushIcon />
          </IconButton>

          <IconButton
            onClick={() => setPaintMode(prev => prev === 'erase' ? 'none' : 'erase')}
            sx={{
              backgroundColor: paintMode === 'erase' ? 'error.main' : 'transparent',
              '&:hover': {
                backgroundColor: paintMode === 'erase' ? 'error.dark' : 'rgba(255, 255, 255, 0.1)',
              },
              width: 40,
              height: 40,
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.77-.78 2.04 0 2.83L5.03 20h7.94l8.44-8.44c.79-.78.79-2.05 0-2.83l-4.84-4.84c-.39-.39-.9-.59-1.41-.59M17 18v2h4v-2z"/>
            </svg>
          </IconButton>
        </Stack>
        
        {paintMode !== 'none' && (
          <Box ref={sliderRef}>
            <Slider
              orientation="vertical"
              value={worldInit.brushSize}
              onChange={(_, value) => setWorldInit(prev => ({ ...prev, brushSize: value as number }))}
              min={5}
              max={50}
              sx={{
                height: 120,
                py: 1,
                '& .MuiSlider-thumb': {
                  backgroundColor: paintMode === 'erase' ? 'error.main' : 'primary.main',
                  width: 20,
                  height: 20,
                  boxShadow: mode === 'dark' ? '0 0 0 8px rgba(255, 255, 255, 0.1)' : '0 0 0 8px rgba(0, 0, 0, 0.1)',
                },
                '& .MuiSlider-track': {
                  backgroundColor: paintMode === 'erase' ? 'error.main' : 'primary.main',
                  width: 4,
                  border: 'none',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                  width: 4,
                  opacity: 1,
                },
                '& .MuiSlider-mark': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                  width: 8,
                  height: 1,
                  marginLeft: -2,
                },
              }}
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          minHeight: '100vh',
          backgroundColor: 'background.default',
          py: 2,
          position: 'relative'
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>Controls</Typography>
                  <IconButton onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} color="inherit" size="small">
                    {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                  </IconButton>
                </Box>

                {/* World Initialization Section */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <SettingsIcon fontSize="small" />
                      <Typography>World Setup</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Obstacle Generation</InputLabel>
                        <Select
                          value={worldInit.method}
                          label="Obstacle Generation"
                          onChange={(e) => setWorldInit(prev => ({ ...prev, method: e.target.value as WorldInitialization['method'] }))}
                        >
                          <MenuItem value="random">Random Distribution</MenuItem>
                          <MenuItem value="uniform">Uniform Grid</MenuItem>
                          <MenuItem value="custom">Custom (Click to Place)</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <Box>
                        <Typography variant="body2" gutterBottom>Number of Obstacles</Typography>
                        <Slider
                          value={worldInit.numObstacles}
                          onChange={(_, value) => {
                            setWorldInit(prev => ({ ...prev, numObstacles: value as number }));
                            if (!isRunning) {
                              setObstacles(generateRandomObstacles({
                                ...worldInit,
                                numObstacles: value as number
                              }));
                            }
                          }}
                          min={5}
                          max={20}
                          step={1}
                          valueLabelDisplay="auto"
                          size="small"
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" gutterBottom>Obstacle Size Range</Typography>
                        <Slider
                          value={[worldInit.minRadius, worldInit.maxRadius]}
                          onChange={(_, value) => {
                            const [min, max] = value as number[];
                            setWorldInit(prev => ({ ...prev, minRadius: min, maxRadius: max }));
                            if (!isRunning) {
                              setObstacles(generateRandomObstacles({
                                ...worldInit,
                                minRadius: min,
                                maxRadius: max
                              }));
                            }
                          }}
                          min={10}
                          max={50}
                          step={1}
                          valueLabelDisplay="auto"
                          size="small"
                          disableSwap
                        />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Min: {worldInit.minRadius}px
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Max: {worldInit.maxRadius}px
                          </Typography>
                        </Stack>
                      </Box>

                      <Button
                        variant="contained"
                        size="small"
                        color="secondary"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                          const newSeed = Math.floor(Math.random() * 1000000);
                          setWorldInit(prev => ({ ...prev, seed: newSeed }));
                          if (!isRunning) {
                            setObstacles(generateRandomObstacles({
                              ...worldInit,
                              seed: newSeed
                            }));
                          }
                        }}
                        disabled={isRunning}
                      >
                        Regenerate World
                      </Button>

                      {worldInit.method === 'custom' && (
                        <Box>
                          <Typography variant="body2" gutterBottom>Brush Size</Typography>
                          <Slider
                            value={worldInit.brushSize}
                            onChange={(_, value) => setWorldInit(prev => ({ ...prev, brushSize: value as number }))}
                            min={5}
                            max={50}
                            step={1}
                            valueLabelDisplay="auto"
                            size="small"
                          />
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => setObstacles([])}
                            sx={{ mt: 1 }}
                          >
                            Clear Obstacles
                          </Button>
                        </Box>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Animation Controls Section */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AnimationIcon fontSize="small" />
                      <Typography>Animation</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        startIcon={isRunning ? <Stop /> : <PlayArrow />}
                        onClick={() => {
                          if (!isRunning) {
                            setSelectedObject(null)
                            setHasReachedGoal(false)
                          }
                          setIsRunning(!isRunning)
                        }}
                        color={isRunning ? "error" : "success"}
                      >
                        {isRunning ? 'Stop' : 'Start'}
                      </Button>

                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                          <SpeedIcon fontSize="small" color="primary" />
                          <Typography variant="body2">Animation Speed</Typography>
                        </Stack>
                        <Slider
                          value={speed}
                          onChange={(_, value) => setSpeed(value as number)}
                          min={1}
                          max={5}
                          step={0.5}
                          valueLabelDisplay="auto"
                          size="small"
                        />
                      </Box>

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showCarPath}
                            onChange={(e) => setShowCarPath(e.target.checked)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">Show Current Path</Typography>}
                      />
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Visualization Controls Section */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <GridIcon fontSize="small" />
                      <Typography>Visualization</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" gutterBottom>Grid Resolution</Typography>
                        <Slider
                          value={pathParams.gridSize}
                          onChange={(_, value) => {
                            setPathParams(prev => ({ ...prev, gridSize: value as number }));
                            // TODO: Update field resolution to match
                          }}
                          min={15}
                          max={100}
                          step={5}
                          valueLabelDisplay="auto"
                          size="small"
                        />
                      </Box>

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showField}
                            onChange={(e) => setShowField(e.target.checked)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">Show Potential Field</Typography>}
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showFieldMagnitude}
                            onChange={(e) => setShowFieldMagnitude(e.target.checked)}
                            size="small"
                            disabled={!showField}
                          />
                        }
                        label={<Typography variant="body2">Show Field Magnitude</Typography>}
                      />

                      <Box>
                        <Typography variant="body2" gutterBottom>Arrow Scale</Typography>
                        <Slider
                          value={arrowScale}
                          onChange={(_, value) => setArrowScale(value as number)}
                          min={0.5}
                          max={3.0}
                          step={0.1}
                          valueLabelDisplay="auto"
                          size="small"
                          disabled={!showField}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" gutterBottom>Arrow Thickness</Typography>
                        <Slider
                          value={arrowThickness}
                          onChange={(_, value) => setArrowThickness(value as number)}
                          min={0.5}
                          max={4.0}
                          step={0.5}
                          valueLabelDisplay="auto"
                          size="small"
                          disabled={!showField}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" gutterBottom>Arrowhead Size</Typography>
                        <Slider
                          value={arrowheadSize}
                          onChange={(_, value) => setArrowheadSize(value as number)}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          valueLabelDisplay="auto"
                          size="small"
                          disabled={!showField}
                        />
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Force Parameters Section */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ScienceIcon fontSize="small" />
                      <Typography>Force Parameters</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" gutterBottom>Goal Attraction</Typography>
                        <Slider
                          value={goalWeight}
                          onChange={(_, value) => setGoalWeight(value as number)}
                          min={0.1}
                          max={2.0}
                          step={0.1}
                          valueLabelDisplay="auto"
                          size="small"
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" gutterBottom>Obstacle Repulsion</Typography>
                        <Slider
                          value={obstacleWeight}
                          onChange={(_, value) => setObstacleWeight(value as number)}
                          min={1000}
                          max={5000}
                          step={100}
                          valueLabelDisplay="auto"
                          size="small"
                        />
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Path Analysis Section */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PathIcon fontSize="small" />
                      <Typography>Path Analysis</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showPaths}
                            onChange={(e) => {
                              setShowPaths(e.target.checked);
                              if (e.target.checked && !isCalculatingPaths) {
                                calculatePaths();
                              }
                            }}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">Show Possible Paths</Typography>}
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={autoUpdatePaths}
                            onChange={(e) => setAutoUpdatePaths(e.target.checked)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">Auto-update Paths</Typography>}
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={randomizeHeading}
                            onChange={(e) => setRandomizeHeading(e.target.checked)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">Randomize Initial Heading</Typography>}
                      />

                      <Box>
                        <Typography variant="body2" gutterBottom>Angles per Point</Typography>
                        <Slider
                          value={pathParams.numAnglesPerPoint}
                          onChange={(_, value) => setPathParams(prev => ({ ...prev, numAnglesPerPoint: value as number }))}
                          min={1}
                          max={8}
                          step={1}
                          valueLabelDisplay="auto"
                          size="small"
                          disabled={randomizeHeading}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" gutterBottom>Min Path Length</Typography>
                        <Slider
                          value={pathParams.minPathLength}
                          onChange={(_, value) => setPathParams(prev => ({ ...prev, minPathLength: value as number }))}
                          min={5}
                          max={50}
                          step={5}
                          valueLabelDisplay="auto"
                          size="small"
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" gutterBottom>Significant Distance</Typography>
                        <Slider
                          value={pathParams.significantDistance}
                          onChange={(_, value) => setPathParams(prev => ({ ...prev, significantDistance: value as number }))}
                          min={20}
                          max={200}
                          step={10}
                          valueLabelDisplay="auto"
                          size="small"
                        />
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Add Goal Settings Section */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PathIcon fontSize="small" />
                      <Typography>Goal Settings</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <FormControl>
                        <FormLabel>Goal Type</FormLabel>
                        <RadioGroup
                          value={goalType}
                          onChange={(e) => setGoalType(e.target.value as 'position' | 'direction')}
                        >
                          <MuiFormControlLabel 
                            value="position" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Position Only</Typography>} 
                          />
                          <MuiFormControlLabel 
                            value="direction" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Position + Direction</Typography>} 
                          />
                        </RadioGroup>
                      </FormControl>

                      {goalType === 'direction' && (
                        <>
                          <Box>
                            <Typography variant="body2" gutterBottom>Direction Threshold (degrees)</Typography>
                            <Slider
                              value={pathParams.directionThreshold * 180 / Math.PI}
                              onChange={(_, value) => setPathParams(prev => ({ 
                                ...prev, 
                                directionThreshold: (value as number) * Math.PI / 180 
                              }))}
                              min={5}
                              max={45}
                              step={5}
                              valueLabelDisplay="auto"
                              size="small"
                            />
                          </Box>
                          <Box>
                            <Typography variant="body2" gutterBottom>Position Threshold (pixels)</Typography>
                            <Slider
                              value={pathParams.positionThreshold}
                              onChange={(_, value) => setPathParams(prev => ({ 
                                ...prev, 
                                positionThreshold: value as number 
                              }))}
                              min={5}
                              max={30}
                              step={5}
                              valueLabelDisplay="auto"
                              size="small"
                            />
                          </Box>
                        </>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Stack>
            </Paper>

            {/* Main content area */}
            <Stack spacing={2} sx={{ flex: 1 }}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 1, 
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                  height: 'calc(100vh - 32px)',
                  position: 'relative'
                }}
              >
                <PaintControls />
                <canvas 
                  ref={canvasRef}
                  style={{ 
                    cursor: paintMode !== 'none' ? 'none' : selectedObject ? 'grabbing' : 'default',
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
