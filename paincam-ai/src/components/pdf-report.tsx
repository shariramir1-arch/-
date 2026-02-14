'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { SessionRow, Exercise } from '@/lib/types';
import type { RecommendationResult } from '@/lib/recommendations';

// Register a font that supports Hebrew (using a Google Fonts URL isn't reliable in all environments,
// so we'll use the built-in Helvetica for English. For Hebrew rendering, the PDF might not render
// Hebrew glyphs perfectly without a custom font. In production, register a Hebrew-supporting font.)

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1d4ed8',
  },
  subheader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  label: {
    color: '#64748b',
    width: '50%',
  },
  value: {
    fontWeight: 'bold',
    width: '50%',
    textAlign: 'right',
  },
  scoreBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1d4ed8',
    textAlign: 'center',
  },
  riskHigh: {
    color: '#dc2626',
  },
  riskModerate: {
    color: '#ca8a04',
  },
  riskLow: {
    color: '#16a34a',
  },
  warning: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 4,
    marginVertical: 6,
  },
  warningText: {
    color: '#dc2626',
    fontSize: 10,
  },
  exerciseItem: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  exerciseName: {
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 2,
  },
  exerciseDetail: {
    fontSize: 9,
    color: '#64748b',
  },
  disclaimer: {
    marginTop: 20,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  },
  meta: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 16,
  },
});

interface PdfReportProps {
  session: SessionRow;
  userName: string;
  recommendations: RecommendationResult;
  exercises: Exercise[];
}

export function PdfReportDocument({
  session,
  userName,
  recommendations,
  exercises,
}: PdfReportProps) {
  const movementTests = session.movement_tests as unknown as Record<string, number>;
  const movementTestLabels: Record<string, string> = {
    neck_rotation_left: 'Neck Rotation Left',
    neck_rotation_right: 'Neck Rotation Right',
    forward_bend: 'Forward Bend',
    back_extension: 'Back Extension',
    squat_depth: 'Squat Depth',
    single_leg_balance_left: 'Single Leg Balance Left',
    single_leg_balance_right: 'Single Leg Balance Right',
  };

  const riskStyle =
    session.risk_level === 'high'
      ? styles.riskHigh
      : session.risk_level === 'moderate'
      ? styles.riskModerate
      : styles.riskLow;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>PainCam AI Report</Text>
        <Text style={styles.meta}>
          {userName} | {new Date(session.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {/* Scores */}
        <View style={styles.scoreBox}>
          <View>
            <Text style={styles.scoreValue}>{session.mobility_score}</Text>
            <Text style={styles.scoreLabel}>Mobility Score</Text>
          </View>
          <View>
            <Text style={[styles.scoreValue, riskStyle]}>
              {session.risk_level.toUpperCase()}
            </Text>
            <Text style={styles.scoreLabel}>Risk Level</Text>
          </View>
        </View>

        {/* Red flags warning */}
        {session.red_flags && (session.red_flags as string[]).length > 0 && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              WARNING: Red flags detected — {(session.red_flags as string[]).join(', ')}. Please seek medical advice.
            </Text>
          </View>
        )}

        {/* Pain Details */}
        <Text style={styles.subheader}>Pain & Wellness Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Pain Area</Text>
          <Text style={styles.value}>{session.pain_area}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pain Intensity</Text>
          <Text style={styles.value}>{session.pain_intensity} / 10</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Stiffness</Text>
          <Text style={styles.value}>{session.stiffness} / 10</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sleep Quality</Text>
          <Text style={styles.value}>{session.sleep_quality} / 10</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Stress</Text>
          <Text style={styles.value}>{session.stress} / 10</Text>
        </View>

        {/* Movement Tests */}
        <Text style={styles.subheader}>Movement Tests</Text>
        {Object.entries(movementTests).map(([key, val]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>
              {movementTestLabels[key] ?? key}
            </Text>
            <Text style={styles.value}>{val} / 3</Text>
          </View>
        ))}

        {/* Recommendations */}
        <Text style={styles.subheader}>Recommended Exercises</Text>
        {recommendations.seekMedicalAdvice && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              Seek medical advice before performing exercises. Only gentle activities recommended.
            </Text>
          </View>
        )}
        {exercises.map((ex) => (
          <View key={ex.id} style={styles.exerciseItem}>
            <Text style={styles.exerciseName}>
              {ex.name} ({ex.durationMin} min, {ex.difficulty})
            </Text>
            {ex.instructionsSteps.map((step, i) => (
              <Text key={i} style={styles.exerciseDetail}>
                {i + 1}. {step}
              </Text>
            ))}
          </View>
        ))}

        {recommendations.sleepTip && (
          <View style={styles.exerciseItem}>
            <Text style={styles.exerciseName}>Sleep Hygiene Tip</Text>
            <Text style={styles.exerciseDetail}>
              Maintain a consistent sleep schedule and avoid screens 1 hour before bed.
            </Text>
          </View>
        )}

        {recommendations.breathingTip && (
          <View style={styles.exerciseItem}>
            <Text style={styles.exerciseName}>Breathing / Relaxation</Text>
            <Text style={styles.exerciseDetail}>
              Inhale 4s, hold 4s, exhale 4s. Repeat 5 times.
            </Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          DISCLAIMER: This report is not a medical diagnosis. Please consult a healthcare professional for medical advice.
        </Text>
      </Page>
    </Document>
  );
}
