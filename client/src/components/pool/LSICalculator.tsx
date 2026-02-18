import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Droplets, Thermometer, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LSIResult {
  lsi: number;
  status: 'corrosive' | 'slightly_corrosive' | 'balanced' | 'slightly_scaling' | 'scaling';
  statusLabel: string;
  recommendation: string;
}

interface LSICalculatorProps {
  compact?: boolean;
  onCalculate?: (result: LSIResult) => void;
  initialValues?: {
    pH?: number;
    temperature?: number;
    calciumHardness?: number;
    totalAlkalinity?: number;
    tds?: number;
    cyanuricAcid?: number;
  };
}

function calculateLSI(pH: number, tempF: number, calciumHardness: number, totalAlkalinity: number, tds: number, cyanuricAcid: number = 0): LSIResult {
  const tempTable: [number, number][] = [
    [32, 0.0], [37, 0.1], [46, 0.2], [53, 0.3], [60, 0.4],
    [66, 0.5], [76, 0.6], [84, 0.7], [94, 0.8], [105, 0.9], [128, 1.0]
  ];

  let tf = 0;
  for (let i = 0; i < tempTable.length - 1; i++) {
    if (tempF <= tempTable[i][0]) { tf = tempTable[i][1]; break; }
    if (tempF <= tempTable[i + 1][0]) {
      const ratio = (tempF - tempTable[i][0]) / (tempTable[i + 1][0] - tempTable[i][0]);
      tf = tempTable[i][1] + ratio * (tempTable[i + 1][1] - tempTable[i][1]);
      break;
    }
    tf = tempTable[tempTable.length - 1][1];
  }

  const cf = Math.log10(Math.max(calciumHardness, 1));

  const adjustedAlk = cyanuricAcid > 0 ? Math.max(totalAlkalinity - (cyanuricAcid / 3), 1) : Math.max(totalAlkalinity, 1);
  const af = Math.log10(adjustedAlk);

  const tdsFactor = tds <= 1000 ? 12.1 : 12.2;

  const lsi = pH + tf + cf + af - tdsFactor;
  const roundedLsi = Math.round(lsi * 100) / 100;

  let status: LSIResult['status'];
  let statusLabel: string;
  let recommendation: string;

  if (roundedLsi < -0.5) {
    status = 'corrosive';
    statusLabel = 'Corrosive';
    recommendation = 'Water is aggressive and may corrode metal surfaces, pool equipment, and plaster. Consider raising pH, calcium hardness, or alkalinity.';
  } else if (roundedLsi < -0.3) {
    status = 'slightly_corrosive';
    statusLabel = 'Slightly Corrosive';
    recommendation = 'Water is slightly aggressive. Minor adjustments to pH or alkalinity may help balance the water.';
  } else if (roundedLsi <= 0.3) {
    status = 'balanced';
    statusLabel = 'Balanced';
    recommendation = 'Water chemistry is well balanced. No immediate adjustments needed.';
  } else if (roundedLsi <= 0.5) {
    status = 'slightly_scaling';
    statusLabel = 'Slightly Scale-Forming';
    recommendation = 'Water has a mild tendency to form scale. Consider slightly lowering pH or alkalinity.';
  } else {
    status = 'scaling';
    statusLabel = 'Scale-Forming';
    recommendation = 'Water is prone to scale formation on surfaces and equipment. Lower pH, alkalinity, or calcium hardness to reduce scaling tendency.';
  }

  return { lsi: roundedLsi, status, statusLabel, recommendation };
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 ml-1">
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function LSIGauge({ lsi }: { lsi: number }) {
  const clampedLsi = Math.max(-2, Math.min(2, lsi));
  const percentage = ((clampedLsi + 2) / 4) * 100;

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>-2.0</span>
        <span>-1.0</span>
        <span>0</span>
        <span>+1.0</span>
        <span>+2.0</span>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #ef4444, #f59e0b 20%, #22c55e 35%, #22c55e 65%, #f59e0b 80%, #ef4444)' }}>
        <div
          className="absolute top-0 h-full w-1 bg-white dark:bg-gray-900 border border-gray-800 dark:border-white rounded-full -translate-x-1/2 shadow-md"
          style={{ left: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Corrosive</span>
        <span>Balanced</span>
        <span>Scaling</span>
      </div>
    </div>
  );
}

export function LSICalculator({ compact = false, onCalculate, initialValues }: LSICalculatorProps) {
  const [values, setValues] = useState({
    pH: initialValues?.pH ?? 7.4,
    temperature: initialValues?.temperature ?? 82,
    calciumHardness: initialValues?.calciumHardness ?? 300,
    totalAlkalinity: initialValues?.totalAlkalinity ?? 100,
    tds: initialValues?.tds ?? 700,
    cyanuricAcid: initialValues?.cyanuricAcid ?? 40,
  });

  const result = useMemo(() => {
    const r = calculateLSI(values.pH, values.temperature, values.calciumHardness, values.totalAlkalinity, values.tds, values.cyanuricAcid);
    onCalculate?.(r);
    return r;
  }, [values, onCalculate]);

  const handleChange = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setValues(prev => ({ ...prev, [field]: val }));
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'balanced': return 'text-green-600 dark:text-green-400';
      case 'slightly_corrosive':
      case 'slightly_scaling': return 'text-yellow-600 dark:text-yellow-400';
      case 'corrosive':
      case 'scaling': return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (result.status) {
      case 'balanced': return 'default';
      case 'slightly_corrosive':
      case 'slightly_scaling': return 'secondary';
      case 'corrosive':
      case 'scaling': return 'destructive';
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'balanced': return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'slightly_corrosive':
      case 'slightly_scaling': return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'corrosive':
      case 'scaling': return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
  };

  const inputFields = [
    {
      key: 'pH' as const,
      label: 'pH',
      min: 0, max: 14, step: 0.1,
      tooltip: 'Measure of water acidity/basicity. Pool ideal: 7.2-7.6',
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
    },
    {
      key: 'temperature' as const,
      label: 'Temperature (°F)',
      min: 32, max: 150, step: 1,
      tooltip: 'Water temperature in Fahrenheit. Typical pool: 78-84°F',
      icon: <Thermometer className="h-4 w-4 text-orange-500" />,
    },
    {
      key: 'calciumHardness' as const,
      label: 'Calcium Hardness (ppm)',
      min: 1, max: 2000, step: 10,
      tooltip: 'Calcium dissolved in water. Ideal: 200-400 ppm',
      icon: null,
    },
    {
      key: 'totalAlkalinity' as const,
      label: 'Total Alkalinity (ppm)',
      min: 1, max: 500, step: 5,
      tooltip: 'Water\'s ability to resist pH changes. Ideal: 80-120 ppm',
      icon: null,
    },
    {
      key: 'tds' as const,
      label: 'TDS (ppm)',
      min: 0, max: 10000, step: 50,
      tooltip: 'Total Dissolved Solids. Normal pool: 300-2000 ppm',
      icon: null,
    },
    {
      key: 'cyanuricAcid' as const,
      label: 'Cyanuric Acid (ppm)',
      min: 0, max: 300, step: 5,
      tooltip: 'Stabilizer/conditioner. Adjusts alkalinity reading. Ideal: 30-50 ppm. Set to 0 if not used.',
      icon: null,
    },
  ];

  const gridCols = compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  const textSize = compact ? 'text-sm' : 'text-base';

  const content = (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className={`grid ${gridCols} gap-3`}>
          {inputFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`lsi-${field.key}`} className={`flex items-center ${compact ? 'text-xs' : 'text-sm'}`}>
                {field.icon && <span className="mr-1">{field.icon}</span>}
                {field.label}
                <InfoTip text={field.tooltip} />
              </Label>
              <Input
                id={`lsi-${field.key}`}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={values[field.key]}
                onChange={handleChange(field.key)}
                className={compact ? 'h-8 text-sm' : ''}
              />
            </div>
          ))}
        </div>

        {values.cyanuricAcid > 0 && (
          <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
            Adjusted Alkalinity: {Math.round(Math.max(values.totalAlkalinity - (values.cyanuricAcid / 3), 1))} ppm (CYA correction applied)
          </p>
        )}

        <div className={`rounded-lg border bg-card p-4 space-y-3 ${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>LSI Result</span>
            </div>
            <Badge variant={getStatusBadgeVariant()}>
              {result.statusLabel}
            </Badge>
          </div>

          <div className={`font-bold ${getStatusColor()} ${compact ? 'text-3xl' : 'text-4xl'} text-center py-1`}>
            {result.lsi > 0 ? '+' : ''}{result.lsi.toFixed(2)}
          </div>

          <LSIGauge lsi={result.lsi} />

          <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>
            {result.recommendation}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );

  if (compact) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          LSI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
