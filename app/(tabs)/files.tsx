import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import {
  connectToResolvedServer,
  getServerUrl,
  onFileShared,
} from '../../src/api/socket';
import { resolveServerUrl } from '../../src/api/serverDiscovery';

const C = {
  bg: '#0B1120',
  surface: '#161F2E',
  elevated: '#1E2A3D',
  border: '#243044',
  primary: '#3B82F6',
  text: '#FFFFFF',
  sub: '#94A3B8',
  muted: '#64748B',
  success: '#22C55E',
  gold: '#FACC15',
  live: '#A855F7',
};

const ROOM = 'general';
const ME = 'مستخدم';

type FileItem = {
  filename: string;
  originalName: string;
  name?: string;
  size?: number;
  room: string;
  from: string;
  uploadedAt: number;
  url?: string;
};

type UploadItem = {
  name: string;
  progress: number;
};

function guessMime(name: string) {
  const e = (name || '').split('.').pop()?.toLowerCase();

  const m: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    apk: 'application/vnd.android.package-archive',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    pdf: 'application/pdf',
  };

  return m[e || ''] || 'application/octet-stream';
}

function humanSize(bytes?: number) {
  if (!bytes) return '';

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1073741824) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function fileIconMeta(name: string) {
  const e = (name || '').split('.').pop()?.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e || '')) {
    return { icon: 'image' as const, color: C.primary };
  }

  if (['mp4', 'mkv', 'mov'].includes(e || '')) {
    return { icon: 'film' as const, color: C.live };
  }

  if (['mp3', 'wav', 'm4a'].includes(e || '')) {
    return { icon: 'musical-notes' as const, color: '#EC4899' };
  }

  if (e === 'apk') {
    return { icon: 'phone-portrait' as const, color: C.success };
  }

  if (e === 'pdf') {
    return { icon: 'document-text' as const, color: '#EF4444' };
  }

  if (['zip', 'rar', '7z'].includes(e || '')) {
    return { icon: 'archive' as const, color: C.gold };
  }

  return {
    icon: 'document-attach' as const,
    color: C.gold,
  };
}

function PressableScale({
  style,
  onPress,
  children,
}: {
  style?: any;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 60,
    }).start();
  };

  const onOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        activeOpacity={0.8}
        onPressIn={onIn}
        onPressOut={onOut}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FilesScreen() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploads, setUploads] = useState<Record<string, UploadItem>>({});
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const flash = useCallback(
    (message: string) => {
      setToast(message);

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }

      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }).start();

      toastTimer.current = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToast(''));
      }, 1900);
    },
    [toastAnim]
  );

  const loadFiles = useCallback(async () => {
    try {
      const url =
        serverUrl ||
        getServerUrl() ||
        (await resolveServerUrl());

      if (!url) {
        flash('⚠️ لم يتم العثور على السيرفر');
        return;
      }

      setServerUrl(url);

      const response = await fetch(
        `${url}/files?room=${encodeURIComponent(ROOM)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        setFiles([]);
        return;
      }

      const normalized: FileItem[] = data.map((item: any) => ({
        filename: item.filename || '',
        originalName:
          item.originalName ||
          item.name ||
          item.filename ||
          'ملف',
        name:
          item.originalName ||
          item.name ||
          item.filename ||
          'ملف',
        size: item.size || 0,
        room: item.room || ROOM,
        from: item.from || 'مجهول',
        uploadedAt: item.uploadedAt || Date.now(),
        url:
          item.url && /^https?:\/\//.test(item.url)
            ? item.url
            : item.filename
              ? `${url}/files/${encodeURIComponent(item.filename)}`
              : undefined,
      }));

      setFiles(normalized);
    } catch (error) {
      console.warn('[FILES] تحميل الملفات فشل:', error);
    }
  }, [serverUrl, flash]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function setup() {
      try {
        const socket = await connectToResolvedServer();

        if (!socket) {
          await loadFiles();
          return;
        }

        const url = getServerUrl();

        if (url) {
          setServerUrl(url);
        }

        cleanup = onFileShared((file: FileItem) => {
          if (file?.room && file.room !== ROOM) {
            return;
          }

          const normalized: FileItem = {
            ...file,
            originalName:
              file.originalName ||
              file.name ||
              file.filename ||
              'ملف',
            name:
              file.originalName ||
              file.name ||
              file.filename ||
              'ملف',
            room: file.room || ROOM,
            from: file.from || 'مجهول',
            url:
              file.url ||
              (url && file.filename
                ? `${url}/files/${encodeURIComponent(file.filename)}`
                : undefined),
          };

          setFiles((previous) => {
            const exists = previous.some(
              (item) => item.filename === normalized.filename
            );

            if (exists) {
              return previous;
            }

            return [normalized, ...previous];
          });

          flash(
            `📥 ملف جديد: ${
              normalized.originalName || normalized.filename
            }`
          );

          Vibration.vibrate(30);
        });

        await loadFiles();
      } catch (error) {
        console.warn('[FILES] Socket setup failed:', error);
      }
    }

    setup();

    return () => {
      cleanup?.();

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [loadFiles, flash]);

  const upload = async (
    uri: string,
    name: string,
    size?: number,
    mime?: string
  ) => {
    const id =
      `${Date.now()}_` +
      Math.random().toString(36).slice(2, 6);

    setUploads((current) => ({
      ...current,
      [id]: {
        name,
        progress: 0,
      },
    }));

    try {
      const url =
        serverUrl ||
        getServerUrl() ||
        (await resolveServerUrl());

      if (!url) {
        throw new Error('Backend غير موجود');
      }

      setServerUrl(url);

      const formData = new FormData();

      formData.append(
        'file',
        {
          uri,
          name,
          type: mime || guessMime(name),
        } as any
      );

      formData.append('room', ROOM);
      formData.append('from', ME);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', `${url}/upload`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          const progress = Math.round(
            (event.loaded / event.total) * 100
          );

          setUploads((current) => ({
            ...current,
            [id]: {
              name,
              progress,
            },
          }));
        };

        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(
              new Error(`Upload HTTP ${xhr.status}`)
            );
            return;
          }

          try {
            const result = JSON.parse(xhr.responseText);

            const meta = result?.file;

            if (meta) {
              const item: FileItem = {
                filename: meta.filename || '',
                originalName:
                  meta.originalName ||
                  name,
                name:
                  meta.originalName ||
                  name,
                size:
                  meta.size ??
                  size ??
                  0,
                room: meta.room || ROOM,
                from: meta.from || ME,
                uploadedAt:
                  meta.uploadedAt ||
                  Date.now(),
                url: `${url}/files/${encodeURIComponent(
                  meta.filename || ''
                )}`,
              };

              setFiles((current) => {
                const exists = current.some(
                  (file) =>
                    file.filename === item.filename
                );

                return exists
                  ? current
                  : [item, ...current];
              });
            }

            flash(`✅ تم إرسال ${name}`);
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network upload error'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload timeout'));
        };

        xhr.send(formData);
      });
    } catch (error) {
      console.warn('[FILES] رفع الملف فشل:', error);
      flash('⚠️ خطأ في إرسال الملف');
    } finally {
      setTimeout(() => {
        setUploads((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }, 800);
    }
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        flash('⚠️ يلزم السماح بالوصول إلى الصور');
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 1,
          allowsMultipleSelection: false,
        });

      if (
        result.canceled ||
        !result.assets ||
        !result.assets[0]
      ) {
        return;
      }

      const asset = result.assets[0];

      const rawName =
        asset.fileName ||
        asset.uri.split('/').pop() ||
        'media';

      const name = decodeURIComponent(rawName);

      await upload(
        asset.uri,
        name,
        asset.fileSize,
        asset.mimeType
      );
    } catch (error) {
      console.warn('[FILES] Image picker error:', error);
      flash('⚠️ تعذّر فتح المعرض');
    }
  };

  const pickFile = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (
        result.canceled ||
        !result.assets ||
        !result.assets[0]
      ) {
        return;
      }

      const asset = result.assets[0];

      await upload(
        asset.uri,
        asset.name || 'file',
        asset.size,
        asset.mimeType
      );
    } catch (error) {
      console.warn('[FILES] Document picker error:', error);
      flash('⚠️ تعذّر فتح الملفات');
    }
  };

  const openFile = async (item: FileItem) => {
    const url =
      item.url ||
      (serverUrl && item.filename
        ? `${serverUrl}/files/${encodeURIComponent(
            item.filename
          )}`
        : null);

    if (!url) {
      flash('⚠️ رابط الملف غير متوفر');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('[FILES] فتح الملف فشل:', error);
      flash('⚠️ تعذّر فتح الملف');
    }
  };

  const renderItem = ({
    item,
  }: {
    item: FileItem;
  }) => {
    const displayName =
      item.originalName ||
      item.name ||
      item.filename ||
      'ملف';

    const meta = fileIconMeta(displayName);

    return (
      <View style={styles.row}>
        <View
          style={[
            styles.fileIcon,
            {
              backgroundColor:
                `${meta.color}22`,
            },
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={24}
            color={meta.color}
          />
        </View>

        <View style={styles.fileInfo}>
          <Text
            style={styles.fileName}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          <Text style={styles.fileMeta}>
            {item.from
              ? `من ${item.from} · `
              : ''}
            {humanSize(item.size)}
          </Text>
        </View>

        <PressableScale
          style={styles.download}
          onPress={() => openFile(item)}
        >
          <Ionicons
            name="download"
            size={22}
            color="#fff"
          />
        </PressableScale>
      </View>
    );
  };

  const uploadList = Object.values(uploads);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />

        <Text style={styles.headerTitle}>
          مشاركة الملفات
        </Text>

        <PressableScale
          style={styles.refresh}
          onPress={loadFiles}
        >
          <Ionicons
            name="refresh"
            size={21}
            color={C.sub}
          />
        </PressableScale>
      </View>

      <View style={styles.picks}>
        <PressableScale
          style={[
            styles.pick,
            {
              backgroundColor: '#152A47',
              borderColor: '#2563EB55',
            },
          ]}
          onPress={pickImage}
        >
          <View
            style={[
              styles.pickIcon,
              {
                backgroundColor: '#3B82F633',
              },
            ]}
          >
            <Ionicons
              name="images"
              size={24}
              color={C.primary}
            />
          </View>

          <Text
            style={styles.pickText}
            maxFontSizeMultiplier={1.2}
          >
            صورة / فيديو
          </Text>
        </PressableScale>

        <PressableScale
          style={[
            styles.pick,
            {
              backgroundColor: '#2A1B3D',
              borderColor: '#A855F755',
            },
          ]}
          onPress={pickFile}
        >
          <View
            style={[
              styles.pickIcon,
              {
                backgroundColor: '#A855F733',
              },
            ]}
          >
            <Ionicons
              name="folder-open"
              size={24}
              color={C.live}
            />
          </View>

          <Text
            style={styles.pickText}
            maxFontSizeMultiplier={1.2}
          >
            ملف / تطبيق
          </Text>
        </PressableScale>
      </View>

      {uploadList.map((uploadItem, index) => (
        <View
          key={`${uploadItem.name}_${index}`}
          style={styles.progressBox}
        >
          <Text
            style={styles.progressName}
            numberOfLines={1}
          >
            ⬆️ {uploadItem.name}
          </Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${uploadItem.progress}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.progressPercent}>
            {uploadItem.progress}%
          </Text>
        </View>
      ))}

      <FlatList
        data={files}
        keyExtractor={(item, index) =>
          `${item.filename || item.originalName}_${index}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyCircle}>
              <Ionicons
                name="cloud-upload-outline"
                size={40}
                color={C.primary}
              />
            </View>

            <Text
              style={styles.emptyTitle}
              maxFontSizeMultiplier={1.2}
            >
              لا ملفات بعد
            </Text>

            <Text
              style={styles.emptyHint}
              maxFontSizeMultiplier={1.2}
            >
              اختر صورة أو ملفًا من الأعلى
              لإرساله للجميع 📤
            </Text>
          </View>
        }
      />

      {!!toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>
            {toast}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },

  headerTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
  },

  refresh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  picks: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },

  pick: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1.5,
  },

  pickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  pickText: {
    color: C.text,
    fontSize: 13.5,
    fontWeight: '700',
  },

  progressBox: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  progressName: {
    color: C.text,
    fontSize: 13,
    marginBottom: 6,
  },

  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.elevated,
    overflow: 'hidden',
  },

  progressFill: {
    height: 6,
    backgroundColor: C.primary,
  },

  progressPercent: {
    color: C.sub,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'left',
  },

  list: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },

  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },

  emptyCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#3B82F61A',
    borderWidth: 1,
    borderColor: '#3B82F640',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    color: C.text,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },

  emptyHint: {
    color: C.muted,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
    paddingHorizontal: 30,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },

  fileName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },

  fileMeta: {
    color: C.muted,
    fontSize: 11,
    marginRight: 10,
    marginTop: 2,
  },

  download: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  toastText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
