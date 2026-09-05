import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Zap,
  Layers,
  Compass,
  Eye,
  Sliders,
  Maximize2,
  Info,
  Radio,
} from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

export interface SourceCharge {
  id: string;
  x: number; // canvas x (pixels)
  y: number; // canvas y (pixels)
  q: number; // charge in microCoulombs (µC)
  isFixed?: boolean;
}

export interface TestCharge {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  q: number; // charge in nanoCoulombs (nC)
  isMoving: boolean;
  trail: Array<{ x: number; y: number }>;
}

export const ElectricFieldSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Source charges array (default: Electric Dipole)
  const [sourceCharges, setSourceCharges] = useState<SourceCharge[]>([
    { id: "c1", x: 280, y: 200, q: 2.0 },
    { id: "c2", x: 440, y: 200, q: -2.0 },
  ]);

  // Test charges array (default: 1 test charge placed between them offset)
  const [testCharges, setTestCharges] = useState<TestCharge[]>([
    {
      id: "tc1",
      x: 360,
      y: 120,
      vx: 0,
      vy: 0,
      q: 1.0, // +1 nC
      isMoving: false,
      trail: [],
    },
  ]);

  // Interaction states
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>("tc1");
  const [draggedTarget, setDraggedTarget] = useState<{
    type: "source" | "test";
    id: string;
  } | null>(null);

  // Visualization options
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showFieldLines, setShowFieldLines] = useState<boolean>(true);
  const [showEquipotentials, setShowEquipotentials] = useState<boolean>(true);
  const [showComponents, setShowComponents] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [fieldLineDensity, setFieldLineDensity] = useState<number>(16); // lines per charge
  const [isMotionRunning, setIsMotionRunning] = useState<boolean>(false);
  const [motionDamping, setMotionDamping] = useState<number>(0.02);

  // Ref to track test charges positions smoothly during animation loop without triggering re-renders
  const testChargesRef = useRef<TestCharge[]>(testCharges);
  useEffect(() => {
    testChargesRef.current = testCharges;
  }, [testCharges]);

  // Physical constant scale: k_e = 8.988e9 N m^2/C^2
  // Scaled for screen coordinates (100 px = 1 meter)
  const PIXELS_PER_METER = 100;
  const K_COULOMB = 8.988e4; // Scaled for screen rendering fidelity

  // Calculate Electric field (Ex, Ey) and Potential V at a point (px, py)
  const calculateFieldAt = useCallback(
    (px: number, py: number, ignoreChargeId?: string) => {
      let ex = 0;
      let ey = 0;
      let v = 0;

      for (const sc of sourceCharges) {
        if (sc.id === ignoreChargeId) continue;
        const dx = (px - sc.x) / PIXELS_PER_METER;
        const dy = (py - sc.y) / PIXELS_PER_METER;
        const rSq = dx * dx + dy * dy;
        const r = Math.sqrt(rSq);

        // Softened singularity radius to prevent infinite forces at collision
        const rSoft = Math.max(r, 0.15);
        const rSoftSq = rSoft * rSoft;

        // E = k * q / r^2 in direction r_hat
        const eMag = (K_COULOMB * sc.q) / rSoftSq;
        ex += eMag * (dx / rSoft);
        ey += eMag * (dy / rSoft);

        // V = k * q / r
        v += (K_COULOMB * sc.q) / rSoft;
      }

      const eMagTotal = Math.sqrt(ex * ex + ey * ey);
      return { ex, ey, eMag: eMagTotal, v };
    },
    [sourceCharges]
  );

  // Selected test charge physics probe state derived with useMemo (no state setter cascade)
  const activeTest = useMemo(() => {
    return testCharges.find((tc) => tc.id === selectedChargeId) || testCharges[0];
  }, [testCharges, selectedChargeId]);

  const probeData = useMemo(() => {
    if (!activeTest) {
      return {
        ex: 0,
        ey: 0,
        eMag: 0,
        fx: 0,
        fy: 0,
        fMag: 0,
        vPotential: 0,
        angleDeg: 0,
      };
    }
    const field = calculateFieldAt(activeTest.x, activeTest.y);
    // F = q * E (q in nC = 1e-9 C, E scaled)
    const fx = activeTest.q * field.ex * 0.05;
    const fy = activeTest.q * field.ey * 0.05;
    const fMag = Math.sqrt(fx * fx + fy * fy);
    const angle = (Math.atan2(field.ey, field.ex) * 180) / Math.PI;

    return {
      ex: field.ex,
      ey: field.ey,
      eMag: field.eMag,
      fx,
      fy,
      fMag,
      vPotential: field.v,
      angleDeg: angle,
    };
  }, [activeTest, calculateFieldAt]);

  // Sonification: adjust continuous tone based on active test charge field metrics
  useEffect(() => {
    if (!sonificationEnabled) {
      sonifier.stopContinuousTone();
      return;
    }
    if (activeTest) {
      const field = calculateFieldAt(activeTest.x, activeTest.y);
      const normV = Math.max(-1, Math.min(1, field.v / 1500));
      const freq = 350 + normV * 250; // 100 Hz to 600 Hz
      const intensity = Math.min(1, field.eMag / 800);
      sonifier.updatePhysicsState({
        frequency: Math.max(80, freq),
        positionX: (activeTest.x / 720) * 2 - 1,
        positionY: intensity,
        fieldStrength: intensity,
      });
    }
  }, [activeTest, calculateFieldAt, sonificationEnabled]);

  // Turn off sound on unmount or disable
  useEffect(() => {
    if (!sonificationEnabled) {
      sonifier.stopContinuousTone();
    }
    return () => {
      sonifier.stopContinuousTone();
    };
  }, [sonificationEnabled]);

  // Animation & Physics Motion Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      // Update free-moving test charges in ref if motion is running
      if (isMotionRunning) {
        testChargesRef.current = testChargesRef.current.map((tc) => {
          const field = calculateFieldAt(tc.x, tc.y);
          // a = (q * E) / m (assuming m = 1.0)
          const ax = tc.q * field.ex * 0.6;
          const ay = tc.q * field.ey * 0.6;

          // Verlet / Euler with damping
          let newVx = (tc.vx + ax * dt) * (1 - motionDamping);
          let newVy = (tc.vy + ay * dt) * (1 - motionDamping);

          // Clamp max speed
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          const MAX_SPEED = 400;
          if (speed > MAX_SPEED) {
            newVx = (newVx / speed) * MAX_SPEED;
            newVy = (newVy / speed) * MAX_SPEED;
          }

          let newX = tc.x + newVx * dt;
          let newY = tc.y + newVy * dt;

          // Bounce off boundaries
          const PAD = 20;
          if (newX < PAD) {
            newX = PAD;
            newVx = -newVx * 0.7;
          } else if (newX > 720 - PAD) {
            newX = 720 - PAD;
            newVx = -newVx * 0.7;
          }
          if (newY < PAD) {
            newY = PAD;
            newVy = -newVy * 0.7;
          } else if (newY > 400 - PAD) {
            newY = 400 - PAD;
            newVy = -newVy * 0.7;
          }

          // Append trail
          const newTrail = [...tc.trail, { x: newX, y: newY }];
          if (newTrail.length > 200) newTrail.shift();

          return {
            ...tc,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            trail: newTrail,
          };
        });
      }

      // Draw canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawCanvas(ctx, canvas.width, canvas.height);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isMotionRunning, motionDamping, calculateFieldAt]);

  // Main Canvas Rendering Function
  const drawCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // 1. Background Grid & Equipotential Heatmap
    if (showEquipotentials && sourceCharges.length > 0) {
      // Coarse grid for performance: render potential shading
      const step = 16;
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          const field = calculateFieldAt(x + step / 2, y + step / 2);
          const v = field.v;
          // Normalize potential: positive = amber/red, negative = cyan/blue
          const norm = Math.tanh(v / 800);
          if (Math.abs(norm) > 0.05) {
            if (norm > 0) {
              ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.22, norm * 0.22)})`;
            } else {
              ctx.fillStyle = `rgba(59, 130, 246, ${Math.min(0.22, Math.abs(norm) * 0.22)})`;
            }
            ctx.fillRect(x, y, step, step);
          }
        }
      }
    }

    // Grid dots/lines
    if (showGrid) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // 2. Electric Field Vectors (Arrow Grid)
    if (showVectors && sourceCharges.length > 0) {
      const vSpacing = 32;
      for (let x = vSpacing / 2; x < width; x += vSpacing) {
        for (let y = vSpacing / 2; y < height; y += vSpacing) {
          const { ex, ey, eMag } = calculateFieldAt(x, y);
          if (eMag < 2) continue;

          // Normalized direction vector
          const ux = ex / eMag;
          const uy = ey / eMag;

          // Intensity mapping: scale arrow length log-harmonically
          const len = Math.min(18, Math.max(6, Math.log10(eMag + 1) * 6));
          const alpha = Math.min(0.85, Math.max(0.15, Math.log10(eMag + 1) * 0.3));

          const startX = x - (ux * len) / 2;
          const startY = y - (uy * len) / 2;
          const endX = x + (ux * len) / 2;
          const endY = y + (uy * len) / 2;

          ctx.strokeStyle = `rgba(51, 65, 85, ${alpha})`;
          ctx.fillStyle = `rgba(51, 65, 85, ${alpha})`;
          ctx.lineWidth = 1.2;

          // Draw vector segment
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const headSize = Math.max(3, len * 0.32);
          const angle = Math.atan2(uy, ux);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headSize * Math.cos(angle - Math.PI / 6),
            endY - headSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - headSize * Math.cos(angle + Math.PI / 6),
            endY - headSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 3. Electric Field Lines (Streamlines)
    if (showFieldLines && sourceCharges.length > 0) {
      ctx.lineWidth = 1.4;

      sourceCharges.forEach((sc) => {
        // Trace field lines radiating outwards from positive charges (or inwards to negative)
        const isPos = sc.q > 0;
        const numLines = Math.max(8, Math.round(fieldLineDensity * Math.abs(sc.q)));
        const startRadius = 18;

        for (let i = 0; i < numLines; i++) {
          const theta = (i / numLines) * 2 * Math.PI;
          let curX = sc.x + startRadius * Math.cos(theta);
          let curY = sc.y + startRadius * Math.sin(theta);

          ctx.beginPath();
          ctx.moveTo(curX, curY);

          // Step along field line using Euler / RK integration
          const stepSize = isPos ? 5 : -5;
          const maxSteps = 90;
          let terminated = false;

          for (let step = 0; step < maxSteps; step++) {
            const { ex, ey, eMag } = calculateFieldAt(curX, curY);
            if (eMag < 1) break;

            const dirX = ex / eMag;
            const dirY = ey / eMag;

            curX += dirX * stepSize;
            curY += dirY * stepSize;

            ctx.lineTo(curX, curY);

            // Boundary check
            if (curX < 0 || curX > width || curY < 0 || curY > height) {
              terminated = true;
              break;
            }

            // Check if line hit another charge
            for (const other of sourceCharges) {
              const d = Math.hypot(curX - other.x, curY - other.y);
              if (d < 16) {
                terminated = true;
                break;
              }
            }
            if (terminated) break;
          }

          ctx.strokeStyle = isPos ? "rgba(239, 68, 68, 0.45)" : "rgba(59, 130, 246, 0.45)";
          ctx.stroke();
        }
      });
    }

    // 4. Test Charges Trails & Bodies
    const chargesToRender = testChargesRef.current.length > 0 ? testChargesRef.current : testCharges;
    chargesToRender.forEach((tc) => {
      // Trail
      if (tc.trail.length > 1) {
        ctx.beginPath();
        tc.trail.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = tc.q > 0 ? "rgba(245, 158, 11, 0.65)" : "rgba(168, 85, 247, 0.65)";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Test Charge Individual Force Components from each Source Charge (Superposition demonstration)
      if (showComponents && sourceCharges.length > 0) {
        sourceCharges.forEach((sc) => {
          const dx = (tc.x - sc.x) / PIXELS_PER_METER;
          const dy = (tc.y - sc.y) / PIXELS_PER_METER;
          const r = Math.max(Math.hypot(dx, dy), 0.15);
          const fMagComp = (K_COULOMB * Math.abs(sc.q) * Math.abs(tc.q)) / (r * r);
          const sign = sc.q * tc.q > 0 ? 1 : -1; // repulsive (+1) or attractive (-1)

          const uX = (dx / r) * sign;
          const uY = (dy / r) * sign;
          const compLen = Math.min(60, Math.max(12, Math.sqrt(fMagComp) * 0.8));

          // Draw dashed component vector
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = sc.q > 0 ? "rgba(239, 68, 68, 0.6)" : "rgba(59, 130, 246, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.moveTo(tc.x, tc.y);
          ctx.lineTo(tc.x + uX * compLen, tc.y + uY * compLen);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // Resultant Net Force Vector on Test Charge (Bold Gold Arrow)
      const field = calculateFieldAt(tc.x, tc.y);
      const netFx = tc.q * field.ex;
      const netFy = tc.q * field.ey;
      const netFMag = Math.hypot(netFx, netFy);

      if (netFMag > 1) {
        const uX = netFx / netFMag;
        const uY = netFy / netFMag;
        const forceArrowLen = Math.min(85, Math.max(18, Math.log10(netFMag + 1) * 26));
        const endX = tc.x + uX * forceArrowLen;
        const endY = tc.y + uY * forceArrowLen;

        // Force arrow shaft
        ctx.strokeStyle = "#f59e0b";
        ctx.fillStyle = "#f59e0b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tc.x, tc.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(uY, uX);
        const headLen = 9;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLen * Math.cos(angle - Math.PI / 6),
          endY - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - headLen * Math.cos(angle + Math.PI / 6),
          endY - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#b45309";
        ctx.fillText("F_net", endX + 6, endY + 4);
      }

      // Test Charge Body
      const isSelected = selectedChargeId === tc.id;
      ctx.save();
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, 11, 0, 2 * Math.PI);
      ctx.fillStyle = tc.q > 0 ? "#f59e0b" : "#a855f7";
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Glowing selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(tc.x, tc.y, 16, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Test charge symbol
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tc.q > 0 ? "+q₀" : "-q₀", tc.x, tc.y);

      // Label below
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText(`Test (${tc.q > 0 ? "+" : ""}${tc.q} nC)`, tc.x, tc.y + 20);
      ctx.restore();
    });

    // 5. Source Charges Bodies
    sourceCharges.forEach((sc) => {
      const isSelected = selectedChargeId === sc.id;
      const isPos = sc.q > 0;
      const radius = Math.min(22, Math.max(14, 13 + Math.abs(sc.q) * 2));

      ctx.save();

      // Pulsing outer aura
      const grad = ctx.createRadialGradient(sc.x, sc.y, radius * 0.5, sc.x, sc.y, radius * 1.8);
      if (isPos) {
        grad.addColorStop(0, "rgba(239, 68, 68, 0.3)");
        grad.addColorStop(1, "rgba(239, 68, 68, 0)");
      } else {
        grad.addColorStop(0, "rgba(59, 130, 246, 0.3)");
        grad.addColorStop(1, "rgba(59, 130, 246, 0)");
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius * 1.8, 0, 2 * Math.PI);
      ctx.fill();

      // Main Charge Sphere
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isPos ? "#dc2626" : "#2563eb";
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? "#facc15" : "#ffffff";
      ctx.stroke();

      // Charge Sign (+ or -)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isPos ? "+" : "−", sc.x, sc.y);

      // Value label below
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = isPos ? "#991b1b" : "#1e40af";
      ctx.fillText(`${sc.q > 0 ? "+" : ""}${sc.q} µC`, sc.x, sc.y + radius + 13);

      ctx.restore();
    });
  };

  // Pointer Interaction Handlers for Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check hit on test charges first
    for (const tc of testCharges) {
      if (Math.hypot(x - tc.x, y - tc.y) < 22) {
        setDraggedTarget({ type: "test", id: tc.id });
        setSelectedChargeId(tc.id);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    // Check hit on source charges
    for (const sc of sourceCharges) {
      if (Math.hypot(x - sc.x, y - sc.y) < 26) {
        setDraggedTarget({ type: "source", id: sc.id });
        setSelectedChargeId(sc.id);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    // Clicked empty space: deselect or place test charge if desired
    setSelectedChargeId(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggedTarget) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(15, Math.min(canvas.width - 15, ((e.clientX - rect.left) / rect.width) * canvas.width));
    const y = Math.max(15, Math.min(canvas.height - 15, ((e.clientY - rect.top) / rect.height) * canvas.height));

    if (draggedTarget.type === "test") {
      setTestCharges((prev) =>
        prev.map((tc) =>
          tc.id === draggedTarget.id
            ? { ...tc, x, y, vx: 0, vy: 0, trail: [...tc.trail, { x, y }].slice(-200) }
            : tc
        )
      );
    } else {
      setSourceCharges((prev) =>
        prev.map((sc) => (sc.id === draggedTarget.id ? { ...sc, x, y } : sc))
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedTarget) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggedTarget(null);
    }
  };

  // Preset Configurations
  const applyPreset = (presetKey: string) => {
    setIsMotionRunning(false);
    if (presetKey === "dipole") {
      setSourceCharges([
        { id: "c1", x: 270, y: 200, q: 2.0 },
        { id: "c2", x: 450, y: 200, q: -2.0 },
      ]);
      setTestCharges([
        { id: "tc1", x: 360, y: 120, vx: 0, vy: 0, q: 1.0, isMoving: false, trail: [] },
      ]);
    } else if (presetKey === "like") {
      setSourceCharges([
        { id: "c1", x: 270, y: 200, q: 2.0 },
        { id: "c2", x: 450, y: 200, q: 2.0 },
      ]);
      setTestCharges([
        { id: "tc1", x: 360, y: 140, vx: 0, vy: 0, q: 1.0, isMoving: false, trail: [] },
      ]);
    } else if (presetKey === "quadrupole") {
      setSourceCharges([
        { id: "c1", x: 260, y: 140, q: 2.0 },
        { id: "c2", x: 460, y: 140, q: -2.0 },
        { id: "c3", x: 260, y: 260, q: -2.0 },
        { id: "c4", x: 460, y: 260, q: 2.0 },
      ]);
      setTestCharges([
        { id: "tc1", x: 360, y: 200, vx: 0, vy: 0, q: 1.0, isMoving: false, trail: [] },
      ]);
    } else if (presetKey === "single") {
      setSourceCharges([{ id: "c1", x: 360, y: 200, q: 3.0 }]);
      setTestCharges([
        { id: "tc1", x: 460, y: 200, vx: 0, vy: 0, q: 1.0, isMoving: false, trail: [] },
      ]);
    } else if (presetKey === "capacitor") {
      setSourceCharges([
        { id: "p1", x: 240, y: 130, q: 1.5 },
        { id: "p2", x: 240, y: 200, q: 1.5 },
        { id: "p3", x: 240, y: 270, q: 1.5 },
        { id: "n1", x: 480, y: 130, q: -1.5 },
        { id: "n2", x: 480, y: 200, q: -1.5 },
        { id: "n3", x: 480, y: 270, q: -1.5 },
      ]);
      setTestCharges([
        { id: "tc1", x: 360, y: 200, vx: 0, vy: 0, q: 1.0, isMoving: false, trail: [] },
      ]);
    } else if (presetKey === "triangle") {
      setSourceCharges([
        { id: "c1", x: 360, y: 120, q: 2.0 },
        { id: "c2", x: 250, y: 280, q: 2.0 },
        { id: "c3", x: 470, y: 280, q: -3.0 },
      ]);
      setTestCharges([
        { id: "tc1", x: 360, y: 220, vx: 0, vy: 0, q: 1.0, isMoving: false, trail: [] },
      ]);
    }
  };

  // Add a new positive or negative source charge
  const addSourceCharge = (qVal: number) => {
    const newId = `sc_${Date.now()}`;
    const x = 320 + (Math.random() * 80 - 40);
    const y = 180 + (Math.random() * 80 - 40);
    setSourceCharges((prev) => [...prev, { id: newId, x, y, q: qVal }]);
    setSelectedChargeId(newId);
  };

  // Add a new test charge
  const addTestCharge = () => {
    const newId = `tc_${Date.now()}`;
    const x = 360 + (Math.random() * 60 - 30);
    const y = 200 + (Math.random() * 60 - 30);
    setTestCharges((prev) => [
      ...prev,
      { id: newId, x, y, vx: 0, vy: 0, q: 1.0, isMoving: false, trail: [] },
    ]);
    setSelectedChargeId(newId);
  };

  // Remove selected charge
  const removeSelectedCharge = () => {
    if (!selectedChargeId) return;
    setSourceCharges((prev) => prev.filter((c) => c.id !== selectedChargeId));
    setTestCharges((prev) => prev.filter((c) => c.id !== selectedChargeId));
    setSelectedChargeId(null);
  };

  // Modify selected charge value
  const updateSelectedChargeValue = (newQ: number) => {
    if (!selectedChargeId) return;
    setSourceCharges((prev) =>
      prev.map((c) => (c.id === selectedChargeId ? { ...c, q: newQ } : c))
    );
    setTestCharges((prev) =>
      prev.map((c) => (c.id === selectedChargeId ? { ...c, q: newQ } : c))
    );
  };

  // Reset test charge trajectories
  const resetTrajectories = () => {
    setTestCharges((prev) =>
      prev.map((tc) => ({
        ...tc,
        vx: 0,
        vy: 0,
        trail: [],
      }))
    );
  };

  // Text-to-speech description of current state
  const speakState = () => {
    const activeTest = testCharges.find((tc) => tc.id === selectedChargeId) || testCharges[0];
    const desc = `Electrostatics charge field simulation. There are ${sourceCharges.length} source charges and ${testCharges.length} test charges placed on the canvas. At the active test charge position, the electric field strength is ${probeData.eMag.toFixed(1)} Volts per meter at an angle of ${probeData.angleDeg.toFixed(0)} degrees. The net Coulomb force is ${probeData.fMag.toFixed(2)} micro-Newtons, and the electric potential is ${probeData.vPotential.toFixed(0)} Volts.`;
    sonifier.speakNarration(desc);
  };

  // Selected item object (if any)
  const selectedSource = sourceCharges.find((c) => c.id === selectedChargeId);
  const selectedTest = testCharges.find((c) => c.id === selectedChargeId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" />
              Electrostatics & Multiple Charge Field Lab
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
              {level === "explorer"
                ? "Explorer: Charge Pull & Push"
                : level === "middle_school"
                ? "Middle School: Coulomb's Law F = k(q1·q2)/r²"
                : level === "high_school"
                ? "High School: Vector Superposition & E-Fields"
                : level === "college"
                ? "College: Gauss's Law & Equipotentials"
                : "Master's: Multipole Expansion & Laplace Equation"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Place, drag, and configure multiple positive and negative charges along with test charges.
            Watch field vectors, streamlines, equipotentials, and net forces dynamically adjust!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="speak-state-charges-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="clear-trajectories-btn"
            onClick={resetTrajectories}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Clear Particle Motion Trails"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="toggle-motion-btn"
            onClick={() => {
              if (isMotionRunning) {
                setTestCharges([...testChargesRef.current]);
              }
              setIsMotionRunning(!isMotionRunning);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isMotionRunning
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isMotionRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isMotionRunning ? "Pause Motion" : "Release Test Charges"}
          </button>
        </div>
      </div>

      {/* Presets & Charge Management Toolbar */}
      <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Preset Configurations */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-blue-600" /> Presets:
          </span>
          {[
            { key: "dipole", label: "Electric Dipole (+ −)" },
            { key: "like", label: "Like Charges (+ +)" },
            { key: "quadrupole", label: "Quadrupole" },
            { key: "capacitor", label: "Parallel Array" },
            { key: "triangle", label: "3-Charge Triangle" },
            { key: "single", label: "Single Charge" },
          ].map((preset) => (
            <button
              key={preset.key}
              id={`preset-${preset.key}-btn`}
              onClick={() => applyPreset(preset.key)}
              className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 font-medium transition-colors shadow-2xs"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Add Charges Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="add-pos-charge-btn"
            onClick={() => addSourceCharge(2.0)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold transition-colors"
            title="Add Positive Source Charge (+2 µC)"
          >
            <Plus className="w-3.5 h-3.5" /> + Charge
          </button>
          <button
            id="add-neg-charge-btn"
            onClick={() => addSourceCharge(-2.0)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-semibold transition-colors"
            title="Add Negative Source Charge (-2 µC)"
          >
            <Minus className="w-3.5 h-3.5" /> − Charge
          </button>
          <button
            id="add-test-charge-btn"
            onClick={addTestCharge}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-semibold transition-colors"
            title="Add Test Charge Probe (+1 nC)"
          >
            <Sparkles className="w-3.5 h-3.5" /> + Test Charge (q₀)
          </button>
          {selectedChargeId && (
            <button
              id="delete-selected-charge-btn"
              onClick={removeSelectedCharge}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-medium transition-colors"
              title="Delete Selected Charge"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage with Overlaid Real-Time HUD */}
      <div className="relative w-full h-[400px] bg-slate-900/5 flex items-center justify-center select-none overflow-hidden">
        <canvas
          ref={canvasRef}
          width={720}
          height={400}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
          title="Interactive Electrostatics Charge Canvas: Drag charges or test charge around to observe forces and fields"
        />

        {/* Real-time Field & Force HUD Card (Top-Right) */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-lg p-3 shadow-md text-xs space-y-1.5 w-60 pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-blue-600" /> Test Charge Probe HUD
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold">
              q₀ = {testCharges[0]?.q || 1} nC
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Net Force |F|</span>
              <span className="font-bold text-amber-600">{probeData.fMag.toFixed(2)} µN</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Force Angle θ</span>
              <span className="font-bold text-slate-700">{probeData.angleDeg.toFixed(1)}°</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Field |E|</span>
              <span className="font-bold text-blue-600">{probeData.eMag.toFixed(1)} V/m</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Potential V</span>
              <span
                className={`font-bold ${
                  probeData.vPotential >= 0 ? "text-red-600" : "text-blue-600"
                }`}
              >
                {probeData.vPotential.toFixed(0)} V
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Drag test charge (gold) to probe</span>
            <span className="font-semibold text-blue-600">{sourceCharges.length} Charges</span>
          </div>
        </div>

        {/* Selected Charge Quick Inspector (Bottom-Left) */}
        {(selectedSource || selectedTest) && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-lg p-2.5 shadow-md text-xs space-y-2 w-64 pointer-events-auto">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                {selectedSource ? "Selected Source Charge" : "Selected Test Charge"}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedSource
                    ? selectedSource.q > 0
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {selectedSource
                  ? `${selectedSource.q > 0 ? "+" : ""}${selectedSource.q} µC`
                  : `${selectedTest!.q > 0 ? "+" : ""}${selectedTest!.q} nC`}
              </span>
            </div>

            {selectedSource && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Charge Value:</span>
                  <span className="font-mono font-bold">
                    {selectedSource.q > 0 ? "+" : ""}
                    {selectedSource.q.toFixed(1)} µC
                  </span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.5"
                  value={selectedSource.q}
                  onChange={(e) => updateSelectedChargeValue(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>-8 µC (Negative)</span>
                  <span>0</span>
                  <span>+8 µC (Positive)</span>
                </div>
              </div>
            )}

            {selectedTest && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Test Charge Sign:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateSelectedChargeValue(1.0)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedTest.q > 0 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      +1 nC
                    </button>
                    <button
                      onClick={() => updateSelectedChargeValue(-1.0)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedTest.q < 0 ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      -1 nC
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visualization Controls & Physics Toggles Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Visual Layer Toggles */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-700 block">Field Visualization Layers</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="rounded text-blue-600 accent-blue-600"
              />
              <span>Electric Field Vectors (Arrow Grid)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showFieldLines}
                onChange={(e) => setShowFieldLines(e.target.checked)}
                className="rounded text-blue-600 accent-blue-600"
              />
              <span>Electric Field Lines (Streamlines)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showEquipotentials}
                onChange={(e) => setShowEquipotentials(e.target.checked)}
                className="rounded text-blue-600 accent-blue-600"
              />
              <span>Equipotential Potential Heatmap</span>
            </label>
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showComponents}
                onChange={(e) => setShowComponents(e.target.checked)}
                className="rounded text-blue-600 accent-blue-600"
              />
              <span>Force Superposition Components</span>
            </label>
          </div>
        </div>

        {/* Field Line Density Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700">Streamline Density</label>
            <span className="font-mono text-slate-600">{fieldLineDensity} lines/charge</span>
          </div>
          <input
            type="range"
            min="8"
            max="24"
            step="2"
            value={fieldLineDensity}
            onChange={(e) => setFieldLineDensity(parseInt(e.target.value))}
            className="w-full accent-blue-600 h-1.5 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Number of electric field lines emanating per unit charge.
          </p>
        </div>

        {/* Motion Damping Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700">Medium Drag / Damping</label>
            <span className="font-mono text-slate-600">{(motionDamping * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.005"
            max="0.08"
            step="0.005"
            value={motionDamping}
            onChange={(e) => setMotionDamping(parseFloat(e.target.value))}
            className="w-full accent-blue-600 h-1.5 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Damps free test charge oscillations when released into the field.
          </p>
        </div>

        {/* Auditory Sonification Guide */}
        <div className="space-y-1.5 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
          <span className="font-bold text-blue-900 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-blue-600" /> Sensory Sonification
          </span>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Drag the test charge to hear the electric potential: pitch increases in positive
            potential regions (near red charges) and descends into deep bass in negative potential
            wells (near blue charges).
          </p>
        </div>
      </div>

      {/* Multi-Level Educational Theory & Derivations */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600" /> Educational Physics Foundations
        </h4>

        {level === "explorer" && (
          <div className="text-xs text-slate-700 space-y-1.5">
            <p>
              <strong>Push & Pull Rule:</strong> In electricity, opposites attract! A positive charge
              (red) pulls on a negative charge (blue), while two identical charges vigorously push
              each other away.
            </p>
            <p>
              <strong>The Golden Test Charge:</strong> The little gold particle shows you what a tiny
              positive charge would feel at that exact spot. Notice how the arrows point straight out
              of positive charges and curl directly into negative charges!
            </p>
          </div>
        )}

        {level === "middle_school" && (
          <div className="text-xs text-slate-700 space-y-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <KatexMath
                math="F = k_e \frac{|q_1 \cdot q_2|}{r^2}, \quad k_e \approx 8.99 \times 10^9 \text{ N}\cdot\text{m}^2/\text{C}^2"
                inline={false}
              />
            </div>
            <p>
              <strong>The Inverse-Square Law:</strong> If you double the distance between two
              charges, the force drops to one-quarter ($1/4$). If you triple the distance, it drops to
              one-ninth ($1/9$). Watch the force arrow shrink rapidly as you drag the test charge
              away!
            </p>
          </div>
        )}

        {level === "high_school" && (
          <div className="text-xs text-slate-700 space-y-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <KatexMath
                math="\vec{E}_{\text{net}} = \sum_{i} \frac{k_e q_i}{r_i^2} \hat{r}_i, \quad \vec{F}_{\text{net}} = q_0 \vec{E}_{\text{net}}"
                inline={false}
              />
            </div>
            <p>
              <strong>Superposition Principle:</strong> The net electric field created by multiple
              charges is the direct vector sum of the individual fields from each charge. The dashed
              colored lines show the individual force contributions adding up tip-to-tail to form the
              bold gold net force vector <KatexMath math="\vec{F}_{\text{net}}" inline />.
            </p>
          </div>
        )}

        {level === "college" && (
          <div className="text-xs text-slate-700 space-y-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <KatexMath
                math="\vec{E} = -\nabla V, \quad \oint_{S} \vec{E} \cdot d\vec{A} = \frac{Q_{\text{enc}}}{\epsilon_0}, \quad V(\vec{r}) = \sum_{i} \frac{1}{4\pi\epsilon_0} \frac{q_i}{|\vec{r} - \vec{r}_i|}"
                inline={false}
              />
            </div>
            <p>
              <strong>Equipotential Orthogonality:</strong> Because the electrostatic field is
              conservative (<KatexMath math="\nabla \times \vec{E} = 0" inline />), electric field lines are everywhere
              strictly perpendicular to the equipotential surfaces (<KatexMath math="V = \text{const}" inline />). Moving a
              charge along an equipotential contour requires zero net mechanical work.
            </p>
          </div>
        )}

        {level === "masters" && (
          <div className="text-xs text-slate-700 space-y-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <KatexMath
                math="\nabla^2 V = -\frac{\rho}{\epsilon_0}, \quad V(\mathbf{r}) = \frac{1}{4\pi\epsilon_0} \left[ \frac{Q}{r} + \frac{\mathbf{p}\cdot\hat{r}}{r^2} + \frac{1}{2r^3} \sum_{i,j} Q_{ij}\hat{r}_i\hat{r}_j + \mathcal{O}(r^{-4}) \right]"
                inline={false}
              />
            </div>
            <p>
              <strong>Multipole Expansion & Symplectic Flow:</strong> For localized charge
              distributions, the asymptotic far-field potential expands into monopole (Q), dipole
              moment (<KatexMath math="\mathbf{p} = \sum q_i \mathbf{r}_i" inline />), and quadrupole tensor (<KatexMath math="Q_{ij}" inline />). In the
              dipole preset, notice how the <KatexMath math="1/r^2" inline /> field decay is noticeably steeper than the <KatexMath math="1/r" inline />
              decay of the isolated monopole!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
