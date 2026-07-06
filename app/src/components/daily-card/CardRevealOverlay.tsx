import { useEffect } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { type DailyCard } from '@/src/constants/dailyCards';
import { type ZodiacSign } from '@/src/constants/zodiac';
import { colors, radius, shadows, spacing, typography } from '@/src/constants/design';

interface CardRevealOverlayProps {
  visible: boolean;
  card: DailyCard;
  zodiacSign?: ZodiacSign;
  onRevealComplete: () => void;
  alreadyOpened?: boolean;
}

const CARD_WIDTH = 270;
const CARD_HEIGHT = 378;

const ZODIAC_IMAGE: Record<ZodiacSign, ImageSourcePropType> = {
  aries:       require('@/assets/images/zodiac/aries.png'),
  taurus:      require('@/assets/images/zodiac/taurus.png'),
  gemini:      require('@/assets/images/zodiac/gemini.png'),
  cancer:      require('@/assets/images/zodiac/cancer.png'),
  leo:         require('@/assets/images/zodiac/leo.png'),
  virgo:       require('@/assets/images/zodiac/virgo.png'),
  libra:       require('@/assets/images/zodiac/libra.png'),
  scorpio:     require('@/assets/images/zodiac/scorpio.png'),
  sagittarius: require('@/assets/images/zodiac/sagittarius.png'),
  capricorn:   require('@/assets/images/zodiac/capricorn.png'),
  aquarius:    require('@/assets/images/zodiac/aquarius.png'),
  pisces:      require('@/assets/images/zodiac/pisces.png'),
};

export function CardRevealOverlay({ visible, card, zodiacSign, onRevealComplete, alreadyOpened }: CardRevealOverlayProps) {
  const dimOpacity = useSharedValue(0);
  const envelopeOpacity = useSharedValue(0);
  const envelopeScale = useSharedValue(0.85);
  const cardTranslateY = useSharedValue(50);
  const cardOpacity = useSharedValue(0);
  const flipProgress = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (alreadyOpened) {
        dimOpacity.value = withTiming(1, { duration: 250 });
        cardTranslateY.value = 0;
        cardOpacity.value = withTiming(1, { duration: 300 });
        flipProgress.value = 1;
        hintOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
      } else {
        dimOpacity.value = withTiming(1, { duration: 300 });
        envelopeOpacity.value = withTiming(1, { duration: 300 });
        envelopeScale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });

        cardOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));
        cardTranslateY.value = withDelay(500, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
        envelopeOpacity.value = withDelay(500, withTiming(0, { duration: 350 }));

        flipProgress.value = withDelay(950, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) }));

        hintOpacity.value = withDelay(1650, withTiming(1, { duration: 300 }));
      }
    } else {
      dimOpacity.value = 0;
      envelopeOpacity.value = 0;
      envelopeScale.value = 0.85;
      cardTranslateY.value = 50;
      cardOpacity.value = 0;
      flipProgress.value = 0;
      hintOpacity.value = 0;
    }
  }, [visible]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));

  const envelopeStyle = useAnimatedStyle(() => ({
    opacity: envelopeOpacity.value,
    transform: [{ scale: envelopeScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const backFaceStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 0.5, 1], [0, 90, 90]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity: flipProgress.value < 0.5 ? 1 : 0,
    };
  });

  const frontFaceStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 0.5, 1], [-90, -90, 0]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity: flipProgress.value >= 0.5 ? 1 : 0,
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
    };
  });

  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Pressable style={styles.fill} onPress={onRevealComplete}>
        {/* Blur + dim background */}
        <Animated.View style={[StyleSheet.absoluteFillObject, dimStyle]}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            intensity={30}
            tint="dark"
          />
          <View style={styles.dimOverlay} />
        </Animated.View>

        {/* Envelope */}
        <Animated.View style={[styles.envelopeWrap, envelopeStyle]} pointerEvents="none">
          <Image
            source={require('@/assets/images/card/envelope.png')}
            style={styles.envelopeImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Card column */}
        <View style={styles.cardColumn}>
          <Animated.View style={[styles.cardAnimWrap, cardAnimStyle]} pointerEvents="none">
            {/* Card faces */}
            <View style={styles.cardWrap}>
              <Animated.View style={[styles.cardFace, backFaceStyle]}>
                <CardBackFace zodiacSign={zodiacSign} />
              </Animated.View>
              <Animated.View style={[styles.cardFace, frontFaceStyle]}>
                <CardFrontFace card={card} zodiacSign={zodiacSign} />
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View style={hintStyle} pointerEvents="none">
            <Text style={styles.tapHint}>화면을 터치하면 닫혀요</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

function CardBackFace({ zodiacSign }: { zodiacSign?: ZodiacSign }) {
  return (
    <LinearGradient
      colors={['#F9EAD5', '#F2D6BC', '#EDCAAB']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradientFill}
    >
      {zodiacSign && (
        <Image source={ZODIAC_IMAGE[zodiacSign]} style={styles.watermark} resizeMode="contain" />
      )}
      <View style={styles.backFrame}>
        <Text style={styles.backStar}>✦</Text>
        <Text style={styles.backLabel}>오늘의 카드</Text>
        <Text style={styles.backStar}>✦</Text>
      </View>
    </LinearGradient>
  );
}

function CardFrontFace({ card, zodiacSign }: { card: DailyCard; zodiacSign?: ZodiacSign }) {
  return (
    <LinearGradient
      colors={['#FFFDF9', '#FFF6EE', '#FBF0E4']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradientFill}
    >
      {zodiacSign && (
        <Image source={ZODIAC_IMAGE[zodiacSign]} style={styles.watermarkFront} resizeMode="contain" />
      )}
      <View style={styles.frontInner}>
        <Text style={styles.frontLabel}>오늘의 카드</Text>
        <View style={styles.frontDivider} />
        <Text style={styles.frontName}>{card.name}</Text>
        <Text style={styles.frontSpell}>"{card.spell}"</Text>
        <View style={styles.frontDivider} />
        <Text style={styles.frontInterpretation}>{card.interpretation}</Text>
      </View>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 8, 2, 0.38)',
  },

  envelopeWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeImage: {
    width: 160,
    height: 128,
  },

  cardColumn: {
    alignItems: 'center',
    gap: spacing.xxl,
  },

  // Animated wrapper that drives translateY + opacity
  cardAnimWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },


  cardWrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    ...shadows.card,
  },
  cardFace: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(210,185,155,0.5)',
  },
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Back face
  watermark: {
    position: 'absolute',
    width: CARD_WIDTH * 0.7,
    height: CARD_WIDTH * 0.7,
    bottom: 16,
    right: -12,
    opacity: 0.1,
  },
  backFrame: {
    borderWidth: 1,
    borderColor: 'rgba(190,155,115,0.35)',
    borderRadius: radius.md,
    width: CARD_WIDTH - 36,
    height: CARD_HEIGHT - 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  backStar: {
    fontSize: 18,
    color: colors.apricotDark,
    opacity: 0.65,
  },
  backLabel: {
    ...typography.label,
    fontSize: 11,
    color: colors.textSoft,
    letterSpacing: 3,
  },

  // Front face
  watermarkFront: {
    position: 'absolute',
    width: CARD_WIDTH * 0.65,
    height: CARD_WIDTH * 0.65,
    bottom: 12,
    right: -8,
    opacity: 0.08,
  },
  frontInner: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  frontLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.textSoft,
  },
  frontDivider: {
    width: 32,
    height: 1,
    backgroundColor: colors.apricot,
    opacity: 0.7,
  },
  frontName: {
    fontSize: 32,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.text,
    letterSpacing: 6,
    textAlign: 'center',
  },
  frontSpell: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  frontInterpretation: {
    ...typography.fortune,
    fontSize: 13,
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 20,
  },

  tapHint: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
