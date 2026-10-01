import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from "react-native-svg";
import { CircleDeco, MoonDeco, StarDeco } from "@/src/components/final/ScreenDeco";
import { colors, gradients, layout } from "@/src/constants/design";
import { APP_TITLE } from "@/src/constants/app";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
      <LinearGradient colors={gradients.screen} style={styles.fill}>
        {/* FinalOnboarding decorations — HTML spec */}
        <CircleDeco
          x={-30}
          y={80}
          size={130}
          color={colors.sky}
          opacity={0.16}
        />
        <CircleDeco
          x={255}
          y={400}
          size={160}
          color={colors.apricot}
          opacity={0.13}
        />
        <CircleDeco
          x={100}
          y={620}
          size={80}
          color={colors.lavender}
          opacity={0.16}
        />
        <StarDeco
          x={40}
          y={118}
          size={7}
          color={colors.yellow}
          opacity={0.45}
        />
        <StarDeco
          x={288}
          y={90}
          size={5}
          color={colors.apricot}
          opacity={0.38}
        />
        <StarDeco
          x={58}
          y={316}
          size={4}
          color={colors.skyDark}
          opacity={0.3}
        />
        <StarDeco
          x={278}
          y={278}
          size={6}
          color={colors.yellow}
          opacity={0.4}
        />
        <StarDeco
          x={148}
          y={518}
          size={5}
          color={colors.apricot}
          opacity={0.35}
        />
        <MoonDeco
          x={265}
          y={158}
          size={28}
          color={colors.apricot}
          opacity={0.3}
        />
        <MoonDeco
          x={18}
          y={475}
          size={20}
          color={colors.skyDark}
          opacity={0.25}
        />
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <OnboardingIntro onStart={onStart} />
        </SafeAreaView>
      </LinearGradient>
  );
}

function OnboardingIntro({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.introWrap}>
      {/* Hero constellation — 190×190, hex pattern per HTML spec */}
      <View style={styles.heroContainer}>
        <Svg
          width={190}
          height={190}
          viewBox="0 0 190 190"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <Defs>
            <RadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.yellow} stopOpacity={0.3} />
              <Stop offset="45%" stopColor={colors.yellow} stopOpacity={0.18} />
              <Stop offset="75%" stopColor={colors.yellow} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={colors.yellow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={95} cy={95} r={95} fill="url(#heroGlow)" />
          {/* Hex outline — sequential edges, strokeOpacity 0.5 */}
          <Line
            x1="60"
            y1="78"
            x2="100"
            y2="58"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="100"
            y1="58"
            x2="140"
            y2="74"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="140"
            y1="74"
            x2="150"
            y2="118"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="150"
            y1="118"
            x2="110"
            y2="138"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="110"
            y1="138"
            x2="70"
            y2="128"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          {/* Closing edge */}
          <Line
            x1="70"
            y1="128"
            x2="60"
            y2="78"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          {/* Cross diagonal — lower opacity */}
          <Line
            x1="100"
            y1="58"
            x2="110"
            y2="138"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.28"
            strokeLinecap="round"
          />
          {/* Vertex dots + center dot */}
          <Circle cx="60" cy="78" r="5" fill={colors.yellow} opacity="0.85" />
          <Circle
            cx="100"
            cy="58"
            r="4.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle cx="140" cy="74" r="4" fill={colors.yellow} opacity="0.85" />
          <Circle
            cx="150"
            cy="118"
            r="3.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle
            cx="110"
            cy="138"
            r="4.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle
            cx="70"
            cy="128"
            r="3.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle cx="95" cy="103" r="3" fill={colors.yellow} opacity="0.85" />
        </Svg>
      </View>

      {/* Logo */}
      <Text style={styles.introLogo}>{APP_TITLE}</Text>

      {/* Tagline — App Store 부제와 같은 문장으로 둔다. 스토어에서 보고 들어온
          사람이 첫 화면에서 같은 말을 만나야 같은 앱으로 읽힌다. */}
      <Text style={styles.introSubtext}>하루 한 장, 그림일기</Text>

      {/* Body */}
      <Text style={styles.introBody}>
        {"오하아사와 함께 오늘 하루를\n그림 한 장으로 남겨보세요."}
      </Text>

      {/* CTA — dark bg, borderRadius 28 per HTML spec */}
      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [
          styles.introButton,
          pressed && styles.introButtonPressed,
        ]}
      >
        <Text style={styles.introButtonText}>시작하기</Text>
      </Pressable>

      {/* Caption */}
      <Text style={styles.introCaption}>매일 새로운 그림 질문이 올라와요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: "hidden" },
  safeArea: { flex: 1, width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center" },
  introWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  heroContainer: {
    width: 190,
    height: 190,
    marginBottom: 32,
  },
  introLogo: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: "NotoSansKR_300Light",
    includeFontPadding: false,
    color: colors.text,
    letterSpacing: 4.8,
    marginBottom: 6,
  },
  introSubtext: {
    fontSize: 11,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    // 원래 2.42였다 — 'おはあさ' 네 글자짜리 워드마크에 맞춘 값이라
    // 문장을 넣으면 글자가 흩어진다.
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  introBody: {
    fontSize: 14,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textMid,
    textAlign: "center",
    lineHeight: 25.2,
    marginBottom: 52,
  },
  introButton: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.text,
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  introButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "NotoSansKR_500Medium",
    includeFontPadding: false,
    color: colors.cream,
    letterSpacing: 0.9,
  },
  introButtonPressed: {
    opacity: 0.72,
  },
  introCaption: {
    fontSize: 12,
    color: colors.textSoft,
  },

});
