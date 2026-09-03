import { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout } from "@/src/constants/design";

interface BottomSheetProps {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const SHEET_HEIGHT = 600;
const OPEN_DURATION = 320;
const CLOSE_DURATION = 240;

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  // Animated.Value는 렌더 간 같은 인스턴스여야 한다. useRef(...).current는
  // 렌더 중 ref를 읽는 셈이라, 같은 보장을 주는 useState의 lazy initializer를 쓴다.
  const [translateY] = useState(() => new Animated.Value(SHEET_HEIGHT));
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      // Modal을 올리는 것과 애니메이션 시작은 같은 tick에 있어야 한다.
      // 렌더 중 setModalVisible로 앞당겼더니 시트가 화면 밖에 뜬 채 화면 전체가
      // 눌리지 않는 상태가 됐다 — Modal이 이미 떠 있는데 여는 애니메이션은
      // 붙지 않아 투명한 오버레이만 남은 것이다.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 위 이유로 effect 안에 있어야 한다.
      setModalVisible(true);
      translateY.setValue(SHEET_HEIGHT);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: OPEN_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: OPEN_DURATION - 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: CLOSE_DURATION - 40,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, translateY, backdropOpacity]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 20, transform: [{ translateY }] },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(44,36,22,0.45)",
  },
  sheet: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    backgroundColor: "#FFFDF9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 24,
  },
});
