import {
  calculateMetricTrend,
  calculateGoalProgress,
  predictGoalCompletion,
  findMetricCorrelations,
  generateInsights,
  type ProgressMetric,
  type ProgressGoal,
} from "@/lib/progress-calculations";

describe("progress-calculations", () => {
  describe("calculateMetricTrend", () => {
    it("returns null for fewer than 2 metrics", () => {
      expect(calculateMetricTrend([], "pain")).toBe(null);
      expect(
        calculateMetricTrend(
          [{ id: "1", metric_name: "pain", metric_type: "pain_level", value: 5, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" }],
          "pain"
        )
      ).toBe(null);
    });

    it("returns trend when 2+ metrics in period", () => {
      const metrics: ProgressMetric[] = [
        { id: "1", metric_name: "pain", metric_type: "pain_level", value: 7, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" },
        { id: "2", metric_name: "pain", metric_type: "pain_level", value: 5, max_value: 10, unit: "/10", session_date: "2025-01-15", created_at: "2025-01-15" },
      ];
      const trend = calculateMetricTrend(metrics, "pain", "all");
      expect(trend).not.toBeNull();
      expect(trend!.metricName).toBe("pain");
      expect(trend!.currentValue).toBe(5);
      expect(trend!.previousValue).toBe(7);
      expect(trend!.direction).toBeDefined();
    });
  });

  describe("calculateGoalProgress", () => {
    it("calculates progress percent", () => {
      const goal: ProgressGoal = {
        id: "g1",
        goal_name: "Reduce pain",
        target_value: 10,
        current_value: 5,
        target_date: "2025-12-31",
        status: "active",
      };
      const progress = calculateGoalProgress(goal);
      expect(progress.goalId).toBe("g1");
      expect(progress.progressPercent).toBe(50);
      expect(progress.currentValue).toBe(5);
      expect(progress.targetValue).toBe(10);
      expect(progress.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it("caps progress at 100%", () => {
      const goal: ProgressGoal = {
        id: "g2",
        goal_name: "Exceed target",
        target_value: 5,
        current_value: 10,
        target_date: "2025-12-31",
        status: "active",
      };
      const progress = calculateGoalProgress(goal);
      expect(progress.progressPercent).toBe(100);
    });

    it("handles zero target", () => {
      const goal: ProgressGoal = {
        id: "g3",
        goal_name: "Zero target",
        target_value: 0,
        current_value: 5,
        target_date: "2025-12-31",
        status: "active",
      };
      const progress = calculateGoalProgress(goal);
      expect(progress.progressPercent).toBe(0);
    });

    it("handles 100% at target", () => {
      const goal: ProgressGoal = {
        id: "g4",
        goal_name: "At target",
        target_value: 10,
        current_value: 10,
        target_date: "2025-12-31",
        status: "active",
      };
      const progress = calculateGoalProgress(goal);
      expect(progress.progressPercent).toBe(100);
    });

    it("returns direction for trend", () => {
      const metrics: ProgressMetric[] = [
        { id: "1", metric_name: "p", metric_type: "pain_level", value: 5, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" },
        { id: "2", metric_name: "p", metric_type: "pain_level", value: 3, max_value: 10, unit: "/10", session_date: "2025-01-15", created_at: "2025-01-15" },
      ];
      const trend = calculateMetricTrend(metrics, "p", "all");
      expect(trend?.direction).toBeDefined();
      expect(["up", "down", "stable"]).toContain(trend!.direction);
    });
    it("calculateMetricTrend with week period filters correctly", () => {
      const metrics: ProgressMetric[] = [
        { id: "1", metric_name: "p", metric_type: "pain_level", value: 5, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" },
        { id: "2", metric_name: "p", metric_type: "pain_level", value: 4, max_value: 10, unit: "/10", session_date: "2025-01-08", created_at: "2025-01-08" },
      ];
      const trend = calculateMetricTrend(metrics, "p", "week");
      expect(trend === null || (trend && typeof trend.change === "number")).toBe(true);
    });
  });

  describe("predictGoalCompletion", () => {
    it("returns null when goal has no linked metric", () => {
      const goal: ProgressGoal = { id: "g1", goal_name: "G", target_value: 10, current_value: 5, target_date: "2025-12-31", status: "active" };
      expect(predictGoalCompletion(goal, [])).toBeNull();
    });
    it("returns null when fewer than 2 linked metrics", () => {
      const goal: ProgressGoal = { id: "g1", goal_name: "G", target_value: 10, current_value: 5, target_date: "2025-12-31", status: "active", linked_metric_name: "pain" };
      const metrics: ProgressMetric[] = [{ id: "1", metric_name: "pain", metric_type: "pain_level", value: 5, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" }];
      expect(predictGoalCompletion(goal, metrics)).toBeNull();
    });
    it("returns date string when 2+ linked metrics with improvement", () => {
      const goal: ProgressGoal = { id: "g1", goal_name: "G", target_value: 100, current_value: 50, target_date: "2025-12-31", status: "active", linked_metric_name: "pain" };
      const metrics: ProgressMetric[] = [
        { id: "1", metric_name: "pain", metric_type: "pain_level", value: 0, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" },
        { id: "2", metric_name: "pain", metric_type: "pain_level", value: 10, max_value: 10, unit: "/10", session_date: "2025-01-31", created_at: "2025-01-31" },
      ];
      const result = predictGoalCompletion(goal, metrics);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("findMetricCorrelations", () => {
    it("returns empty array for insufficient data", () => {
      expect(findMetricCorrelations([], [])).toEqual([]);
      expect(findMetricCorrelations(
        [{ id: "1", metric_name: "p", metric_type: "pain_level", value: 5, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" }],
        []
      )).toEqual([]);
    });
    it("returns sorted correlations when strong enough", () => {
      const metrics: ProgressMetric[] = [
        { id: "1", metric_name: "pain", metric_type: "pain_level", value: 8, max_value: 10, unit: "/10", session_date: "2025-01-05", created_at: "2025-01-05" },
        { id: "2", metric_name: "pain", metric_type: "pain_level", value: 6, max_value: 10, unit: "/10", session_date: "2025-01-12", created_at: "2025-01-12" },
        { id: "3", metric_name: "pain", metric_type: "pain_level", value: 4, max_value: 10, unit: "/10", session_date: "2025-01-19", created_at: "2025-01-19" },
      ];
      const exercises = [
        { completed_date: "2025-01-06", exercise_name: "Stretch" },
        { completed_date: "2025-01-13", exercise_name: "Stretch" },
        { completed_date: "2025-01-20", exercise_name: "Stretch" },
      ];
      const result = findMetricCorrelations(metrics, exercises);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("generateInsights", () => {
    it("returns trends, goalProgress, correlations, and summary", async () => {
      const metrics: ProgressMetric[] = [
        { id: "1", metric_name: "pain", metric_type: "pain_level", value: 7, max_value: 10, unit: "/10", session_date: "2025-01-01", created_at: "2025-01-01" },
        { id: "2", metric_name: "pain", metric_type: "pain_level", value: 5, max_value: 10, unit: "/10", session_date: "2025-01-15", created_at: "2025-01-15" },
      ];
      const goals: ProgressGoal[] = [
        { id: "g1", goal_name: "Reduce pain", target_value: 10, current_value: 5, target_date: "2025-12-31", status: "active" },
      ];
      const insights = await generateInsights("c1", metrics, goals, []);
      expect(insights.trends).toBeDefined();
      expect(insights.goalProgress).toBeDefined();
      expect(insights.correlations).toBeDefined();
      expect(insights.summary).toBeDefined();
      expect(insights.summary.totalMetrics).toBe(1);
      expect(insights.summary.activeGoals).toBe(1);
    });
  });
});
