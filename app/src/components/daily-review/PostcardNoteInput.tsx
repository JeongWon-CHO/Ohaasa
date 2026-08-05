import { Feather } from "@expo/vector-icons";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing } from "@/src/constants/design";

const MAX_LENGTH = 100;

interface PostcardNoteInputProps {
  value: string;
  onChange: (text: string) => void;
  dateLabel: string;
  zodiacLabel: string;
}

export function PostcardNoteInput({
  value,
  onChange,
  dateLabel,
  zodiacLabel,
}: PostcardNoteInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>오늘을 한 줄로 남기기</Text>

      <View style={styles.postcard}>
        {/* 엽서 상단 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.dateText}>{dateLabel}</Text>
            <Text style={styles.zodiacText}>{zodiacLabel}</Text>
          </View>
          <View style={styles.stamp}>
            <Feather name="moon" size={12} color={colors.apricotDark} />
            <Text style={styles.stampStar}>✦</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => onChange(text.slice(0, MAX_LENGTH))}
          placeholder="오늘의 별 조각을 남겨보세요"
          placeholderTextColor={colors.textSoft}
          multiline
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          textAlignVertical="top"
          scrollEnabled={false}
        />

        <Text style={styles.charCount}>
          {value.length}/{MAX_LENGTH}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  question: {
    fontSize: 14,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
  },

  postcard: {
    backgroundColor: "#FFFDF5",
    borderWidth: 1,
    borderColor: "rgba(205,185,155,0.55)",
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    gap: 2,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    letterSpacing: 0.5,
  },
  zodiacText: {
    fontSize: 13,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.textMid,
  },

  stamp: {
    width: 32,
    height: 38,
    borderWidth: 1,
    borderColor: "rgba(240,184,154,0.5)",
    borderRadius: 3,
    backgroundColor: "rgba(240,184,154,0.07)",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  stampStar: {
    fontSize: 7,
    color: colors.apricot,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(205,185,155,0.35)",
  },

  input: {
    fontSize: 14,
    fontFamily: "NotoSansKR_300Light",
    color: colors.text,
    lineHeight: 22,
    minHeight: 66,
    includeFontPadding: false,
    paddingTop: spacing.xs,
  },

  charCount: {
    fontSize: 11,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    textAlign: "right",
  },
});
