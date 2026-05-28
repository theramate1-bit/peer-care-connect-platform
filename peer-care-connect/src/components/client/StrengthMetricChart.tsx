import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { ProgressMetric } from '@/lib/types/progress';

interface StrengthMetricChartProps {
  metrics: ProgressMetric[];
}

export const StrengthMetricChart: React.FC<StrengthMetricChartProps> = ({ metrics }) => {
  // Filter only strength metrics
  const strengthMetrics = useMemo(() => {
    return metrics.filter(m => m.metric_type === 'strength');
  }, [metrics]);

  // Get unique strength metric names
  const strengthMetricNames = useMemo(() => {
    return Array.from(new Set(strengthMetrics.map(m => m.metric_name))).sort();
  }, [strengthMetrics]);

  const [selectedMetric, setSelectedMetric] = useState<string>(strengthMetricNames[0] || '');

  React.useEffect(() => {
    if (strengthMetricNames.length > 0 && !strengthMetricNames.includes(selectedMetric)) {
      setSelectedMetric(strengthMetricNames[0]);
    }
  }, [strengthMetricNames, selectedMetric]);

  // Filter data for the chart
  const chartData = useMemo(() => {
    if (!selectedMetric) return [];

    const filtered = strengthMetrics
      .filter(m => m.metric_name === selectedMetric)
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

    return filtered.map(m => ({
      date: m.session_date,
      dateFormatted: format(new Date(m.session_date), 'MMM dd'),
      value: m.value,
      unit: m.unit,
      max: m.max_value,
      notes: m.notes,
      joint: m.metadata?.joint,
      movement: m.metadata?.movement,
      side: m.metadata?.side
    }));
  }, [strengthMetrics, selectedMetric]);

  const currentMetricInfo = useMemo(() => {
    return strengthMetrics.find(m => m.metric_name === selectedMetric);
  }, [strengthMetrics, selectedMetric]);

  if (strengthMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Strength Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No strength metrics recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Strength Metrics
        </CardTitle>
        {strengthMetricNames.length > 1 && (
          <div className="w-[200px]">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {strengthMetricNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={[0, 5]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  label={{ value: 'Oxford Scale', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium mb-1">{label}</p>
                          <p className="text-green-600 font-bold">
                            {data.value} <span className="text-muted-foreground font-normal">/5</span>
                          </p>
                          {data.joint && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {data.side && `${data.side} `}{data.joint} {data.movement}
                            </p>
                          )}
                          {data.notes && <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{data.notes}</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a metric to view trends
            </div>
          )}
        </div>
        <div className="flex justify-center mt-2 gap-4 text-xs text-muted-foreground">
          {currentMetricInfo && (
            <>
              <span>Unit: {currentMetricInfo.unit}</span>
              <span>Scale: 0-5 (Oxford)</span>
              {currentMetricInfo.metadata?.joint && (
                <span>{currentMetricInfo.metadata.side} {currentMetricInfo.metadata.joint} {currentMetricInfo.metadata.movement}</span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

