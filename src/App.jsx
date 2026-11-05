import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue 
} from 'firebase/database';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  MinusCircle, 
  Calendar, 
  Users, 
  Download, 
  Plus, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Cloud, 
  Check, 
  RefreshCw,
  FileSpreadsheet,
  UserPlus,
  CalendarPlus,
  Info,
  Sparkles,
  RotateCcw,
  BookOpen,
  GraduationCap,
  History,
  Database,
  Search,
  X,
  MessageSquarePlus,
  School,
  Award,
  Phone,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  TrendingUp,
  Wifi,
  WifiOff
} from 'lucide-react';

// --- 您的專屬 Firebase 金鑰設定（已直接連線至 Green-Attendance） ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0B4kNJ1TD6cEfbTep_5j4KdsEzL8clXs",
  authDomain: "green-homework-attendance.firebaseapp.com",
  databaseURL: "https://green-homework-attendance-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "green-homework-attendance",
  storageBucket: "green-homework-attendance.firebasestorage.app",
  messagingSenderId: "552694184199",
  appId: "1:552694184199:web:f50deaefbd39885d662da2"
};

// 初始化具名 Firebase 實例，避免與環境內既有的 [DEFAULT] App 衝突 (app/duplicate-app)
const APP_NAME = "green-attendance-app";
let firebaseApp = null;
let rtdb = null;

try {
  const existingApps = getApps();
  const matchedApp = existingApps.find(app => app.name === APP_NAME);
  if (matchedApp) {
    firebaseApp = matchedApp;
  } else {
    firebaseApp = initializeApp(FIREBASE_CONFIG, APP_NAME);
  }
  rtdb = getDatabase(firebaseApp);
} catch (e) {
  console.warn('Firebase RTDB init notice:', e);
}

// --- 預設初始資料 (來自 Excel 名單 + 預載學校、年級、科目成績、導師紀錄與備註歷史) ---
const INITIAL_SESSIONS = [
  { id: 's1', label: '10月17日', isCustom: false },
  { id: 's2', label: '11月7日', isCustom: false },
  { id: 's3', label: '11月21日', isCustom: false },
  { id: 's4', label: '12月5日', isCustom: false },
  { id: 's5', label: '12月19日', isCustom: false },
  { id: 's6', label: '自訂堂次 (一)', isCustom: true },
  { id: 's7', label: '自訂堂次 (二)', isCustom: true },
  { id: 's8', label: '自訂堂次 (三)', isCustom: true },
];

// 預設導師名單（支援動態後加導師並同步至雲端）
const INITIAL_TUTORS = ['David', '倩如', '聰哥', '瑞琼', '小瑜', 'Steffi', '阿恒'];

// 科目成績表現評級設定（讓導師一眼看出學生哪方面需要加強）
const PERFORMANCE_LEVELS = {
  critical: {
    key: 'critical',
    label: '急需加強',
    dot: '🔴',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-500/20',
    tagClass: 'bg-rose-600 text-white',
    priority: 1
  },
  warning: {
    key: 'warning',
    label: '需多留意',
    dot: '🟠',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    tagClass: 'bg-amber-500 text-white',
    priority: 2
  },
  good: {
    key: 'good',
    label: '表現平穩',
    dot: '🔵',
    badgeClass: 'bg-sky-50 text-sky-900 border-sky-200',
    tagClass: 'bg-sky-600 text-white',
    priority: 3
  },
  excellent: {
    key: 'excellent',
    label: '表現優異',
    dot: '🟢',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    tagClass: 'bg-emerald-600 text-white',
    priority: 4
  }
};

const GRADE_OPTIONS = ['小一', '小二', '小三', '小四', '小五', '小六', '中一', '中二', '中三', '中四', '中五', '中六'];
const RELATION_OPTIONS = ['母親', '父親', '家長', '監護人', '其他親屬'];

const INITIAL_STUDENTS = [
  {
    id: 'st1',
    order: 1,
    name: '羅梓釗',
    parentName: '吳玉婷',
    emergencyContactName: '吳玉婷',
    emergencyContactRelation: '家長',
    emergencyContactPhone: '91234567',
    school: '聖公會基樂小學',
    grade: '小四',
    subjects: ['中文', '英文', '數學'],
    subjectGrades: {
      '中文': { level: 'warning', score: '需多留意' },
      '英文': { level: 'critical', score: '急需加強' },
      '數學': { level: 'good', score: '表現平穩' }
    },
    currentProgress: '英文動詞時態 Unit 3',
    progressUpdatedAt: '2026-10-17 16:45',
    remarks: '已交回條（簽署日期：2026-09-19）',
    remarksHistory: [
      { id: 'rm_101', text: '已交回條（簽署日期：2026-09-19）', date: '2026-09-19 15:00' }
    ],
    attendance: { s1: 'present' },
    sessionTutors: {},
    reviewLogs: []
  },
  {
    id: 'st2',
    order: 2,
    name: '譚家俊',
    parentName: '譚宗傑',
    emergencyContactName: '譚宗傑',
    emergencyContactRelation: '家長',
    emergencyContactPhone: '92345678',
    school: '觀塘官立小學',
    grade: '小五',
    subjects: ['數學', '常識'],
    subjectGrades: {
      '數學': { level: 'critical', score: '急需加強' },
      '常識': { level: 'excellent', score: '表現優異' }
    },
    currentProgress: '分數四則混合計算',
    progressUpdatedAt: '2026-10-17 16:40',
    remarks: '已交回條（簽署日期：2026-09-19）',
    remarksHistory: [
      { id: 'rm_201', text: '已交回條（簽署日期：2026-09-19）', date: '2026-09-19 15:00' }
    ],
    attendance: { s1: 'present' },
    sessionTutors: {},
    reviewLogs: []
  },
  {
    id: 'st3',
    order: 3,
    name: '張頌茵',
    parentName: '鄧詩韻',
    emergencyContactName: '鄧詩韻',
    emergencyContactRelation: '家長',
    emergencyContactPhone: '93456789',
    school: '中華基督教會基智中學',
    grade: '中一',
    subjects: ['中文', '英文'],
    subjectGrades: {
      '中文': { level: 'good', score: '表現平穩' },
      '英文': { level: 'warning', score: '需多留意' }
    },
    currentProgress: '初中文言文閱讀理解 Unit 2',
    progressUpdatedAt: '2026-10-17 16:30',
    remarks: '已交回條（簽署日期：2026-09-19）',
    remarksHistory: [
      { id: 'rm_301', text: '已交回條（簽署日期：2026-09-19）', date: '2026-09-19 15:00' }
    ],
    attendance: { s1: 'present' },
    sessionTutors: {},
    reviewLogs: []
  },
  {
    id: 'st4',
    order: 4,
    name: '張頌儀',
    parentName: '鄧詩韻',
    emergencyContactName: '鄧詩韻',
    emergencyContactRelation: '家長',
    emergencyContactPhone: '93456789',
    school: '中華基督教會基智中學',
    grade: '中一',
    subjects: ['中文', '數學'],
    subjectGrades: {
      '中文': { level: 'warning', score: '需多留意' },
      '數學': { level: 'good', score: '表現平穩' }
    },
    currentProgress: '代數方程式應用題',
    progressUpdatedAt: '2026-10-17 16:30',
    remarks: '已交回條（簽署日期：2026-09-19）',
    remarksHistory: [
      { id: 'rm_401', text: '已交回條（簽署日期：2026-09-19）', date: '2026-09-19 15:00' }
    ],
    attendance: { s1: 'present' },
    sessionTutors: {},
    reviewLogs: []
  },
  {
    id: 'st5',
    order: 5,
    name: '陳志軒',
    parentName: '陳其東',
    emergencyContactName: '陳其東',
    emergencyContactRelation: '家長',
    emergencyContactPhone: '94567890',
    school: '聖公會基樂小學',
    grade: '小三',
    subjects: ['中文', '英文'],
    subjectGrades: {
      '中文': { level: 'critical', score: '急需加強' },
      '英文': { level: 'warning', score: '需多留意' }
    },
    currentProgress: '成語運用與重組句子',
    progressUpdatedAt: '2026-10-17 16:50',
    remarks: '已交回條（簽署日期：2026-09-19）',
    remarksHistory: [
      { id: 'rm_501', text: '已交回條（簽署日期：2026-09-19）', date: '2026-09-19 15:00' }
    ],
    attendance: { s1: 'present' },
    sessionTutors: {},
    reviewLogs: []
  }
];

// 格式化日期時間輔助函式 (YYYY-MM-DD HH:mm)
const formatNowDateTime = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
};

// 確保舊版學生資料自動升級相容結構 (包含緊急聯絡人、科目成績、導師紀錄)
const normalizeStudent = (st, idx) => {
  const history = Array.isArray(st.remarksHistory) && st.remarksHistory.length > 0
    ? st.remarksHistory
    : st.remarks
      ? [{ id: `init_${st.id || idx}`, text: st.remarks, date: '2026-09-19 15:00' }]
      : [];
  const latestRemark = history.length > 0 ? history[0].text : (st.remarks || '');

  const subjects = Array.isArray(st.subjects) ? st.subjects : ['中文', '英文', '數學'];
  const rawGrades = st.subjectGrades || {};
  const normalizedGrades = {};
  subjects.forEach((subj) => {
    normalizedGrades[subj] = rawGrades[subj] || { level: 'good', score: '' };
  });

  const emergencyName = st.emergencyContactName ?? st.parentName ?? '—';
  const emergencyPhone = st.emergencyContactPhone ?? st.phone ?? '';
  const emergencyRelation = st.emergencyContactRelation ?? '家長';

  // 正規化各堂導師與分科溫習紀錄
  const rawSessionTutors = st.sessionTutors || {};
  const normalizedSessionTutors = {};
  Object.entries(rawSessionTutors).forEach(([sId, sVal]) => {
    const revSubjs = Array.isArray(sVal?.reviewedSubjects) ? sVal.reviewedSubjects : [];
    const subjNotes = sVal?.subjectNotes && typeof sVal.subjectNotes === 'object' ? { ...sVal.subjectNotes } : {};
    normalizedSessionTutors[sId] = {
      tutors: Array.isArray(sVal?.tutors) ? sVal.tutors : [],
      reviewedSubjects: revSubjs,
      subjectNotes: subjNotes,
      note: sVal?.note || '',
      updatedAt: sVal?.updatedAt || ''
    };
  });

  // 正規化長期溫習資料庫紀錄 (reviewLogs)
  let reviewLogs = Array.isArray(st.reviewLogs) ? [...st.reviewLogs] : [];
  if (reviewLogs.length === 0) {
    Object.entries(normalizedSessionTutors).forEach(([sId, sVal]) => {
      if ((sVal.tutors && sVal.tutors.length > 0) || (sVal.reviewedSubjects && sVal.reviewedSubjects.length > 0) || sVal.note) {
        const sessObj = INITIAL_SESSIONS.find((item) => item.id === sId);
        reviewLogs.push({
          id: `rl_init_${st.id || idx}_${sId}`,
          sessionId: sId,
          sessionLabel: sessObj ? sessObj.label : sId,
          tutors: sVal.tutors || [],
          reviewedSubjects: sVal.reviewedSubjects || [],
          subjectNotes: sVal.subjectNotes || {},
          note: sVal.note || '',
          updatedAt: sVal.updatedAt || '2026-10-17 16:30'
        });
      }
    });
  }

  return {
    ...st,
    order: st.order || idx + 1,
    parentName: st.parentName || emergencyName,
    emergencyContactName: emergencyName,
    emergencyContactRelation: emergencyRelation,
    emergencyContactPhone: emergencyPhone,
    phone: emergencyPhone, // 保持向下相容
    school: st.school ?? '未填寫學校',
    grade: st.grade ?? '未設定年級',
    subjects,
    subjectGrades: normalizedGrades,
    currentProgress: st.currentProgress ?? '尚未填寫最新學習進度',
    progressUpdatedAt: st.progressUpdatedAt ?? '2026-09-19 15:00',
    remarks: latestRemark,
    remarksHistory: history,
    attendance: st.attendance || {},
    sessionTutors: normalizedSessionTutors,
    reviewLogs
  };
};

export default function App() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [tutors, setTutors] = useState(INITIAL_TUTORS);
  const [selectedSessionId, setSelectedSessionId] = useState('s1');
  const [activeTab, setActiveTab] = useState('daily');
  const [showInfo, setShowInfo] = useState(false);
  const [isCloudLive, setIsCloudLive] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error' | 'offline'
  const [lastSavedTime, setLastSavedTime] = useState('剛剛');
  const [toastMessage, setToastMessage] = useState('');
  const [manageTutorsMode, setManageTutorsMode] = useState(false);

  // 學生檔案 Modal 狀態
  const [profileModal, setProfileModal] = useState({
    open: false,
    mode: 'view', // 'view' | 'edit' | 'add'
    data: null,
    customSubject: ''
  });

  // 備註歷史 Modal 狀態
  const [remarksModal, setRemarksModal] = useState({
    open: false,
    studentId: null,
    newText: '',
    newDate: '',
    editingHistoryId: null,
    editingText: '',
    editingDate: ''
  });

  // 課堂日期編輯 Modal 狀態
  const [sessionModal, setSessionModal] = useState({
    open: false,
    session: null,
    newLabel: ''
  });

  // 導師管理 Modal 狀態
  const [tutorModal, setTutorModal] = useState({
    open: false,
    studentId: null,
    newTutorName: ''
  });

  // 確認對話框 Modal 狀態
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // 資料庫搜尋與篩選狀態
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbSubjectFilter, setDbSubjectFilter] = useState('ALL');
  const [dbPerformanceFilter, setDbPerformanceFilter] = useState('ALL'); // 'ALL' | 'NEEDS_HELP'

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 動態統計所有學生中「至少有一人選修」的科目清單（0人選修的自動消失）
  const activeSubjectsInUse = useMemo(() => {
    const setOfSubjs = new Set();
    students.forEach((st) => {
      (st.subjects || []).forEach((subj) => {
        if (subj && subj.trim()) setOfSubjs.add(subj.trim());
      });
    });
    return Array.from(setOfSubjs);
  }, [students]);

  // 1. 即時連線監聽 Firebase Realtime Database（多手機即時雙向同步）
  useEffect(() => {
    if (!rtdb) {
      setSaveStatus('offline');
      return;
    }

    const attendanceDbRef = ref(rtdb, 'green_attendance_data');
    const unsubscribe = onValue(
      attendanceDbRef,
      (snapshot) => {
        setIsCloudLive(true);
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (Array.isArray(val.students)) {
            const initialMap = Object.fromEntries(INITIAL_STUDENTS.map((s) => [s.id, s]));
            const normalized = val.students.map((st, idx) => {
              const fallback = initialMap[st.id] || {};
              return normalizeStudent({ ...fallback, ...st }, idx);
            });
            setStudents(normalized);
          }
          if (Array.isArray(val.sessions)) setSessions(val.sessions);
          if (Array.isArray(val.tutors)) setTutors(val.tutors);
          if (val.updatedAt) {
            const d = new Date(val.updatedAt);
            setLastSavedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
          }
          setSaveStatus('saved');
        } else {
          // 資料庫尚無資料時，進行首次初始化寫入
          saveToCloud(INITIAL_STUDENTS, INITIAL_SESSIONS, INITIAL_TUTORS, null, true);
        }
      },
      (error) => {
        console.error('Realtime Database listen error:', error);
        setIsCloudLive(false);
        setSaveStatus('offline');
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. 儲存資料至 Firebase Realtime Database 及本機備援
  const saveToCloud = async (
    nextStudents,
    nextSessions,
    nextTutors = tutors,
    overrideUser = null,
    silent = false
  ) => {
    setStudents(nextStudents);
    setSessions(nextSessions);
    setTutors(nextTutors);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      localStorage.setItem(
        'green_attendance_backup_2026Q1',
        JSON.stringify({
          students: nextStudents,
          sessions: nextSessions,
          tutors: nextTutors,
          updatedAt: now.toISOString()
        })
      );
    } catch (e) {
      console.warn('LocalStorage backup notice:', e);
    }

    if (!rtdb) {
      setSaveStatus('offline');
      setLastSavedTime(timeStr);
      return;
    }

    setSaveStatus('saving');
    try {
      const attendanceDbRef = ref(rtdb, 'green_attendance_data');
      await set(attendanceDbRef, {
        students: nextStudents,
        sessions: nextSessions,
        tutors: nextTutors,
        updatedAt: now.toISOString()
      });
      setSaveStatus('saved');
      setLastSavedTime(timeStr);
      setIsCloudLive(true);
    } catch (err) {
      console.error('Save to Realtime Database error:', err);
      setSaveStatus('error');
    }
  };

  // 手動點擊「立即保存」按鈕
  const handleManualSave = async () => {
    await saveToCloud(students, sessions, tutors);
    showToast('✓ 點名、導師溫習紀錄及學生資料庫已全部保存！');
  };

  // 當前選中的課堂
  const currentSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || sessions[0],
    [sessions, selectedSessionId]
  );

  // --- 點名核心操作 ---
  const handleSetAttendance = (studentId, status) => {
    const updatedStudents = students.map((st) => {
      if (st.id !== studentId) return st;
      return {
        ...st,
        attendance: {
          ...(st.attendance || {}),
          [selectedSessionId]: status
        }
      };
    });
    saveToCloud(updatedStudents, sessions, tutors);
  };

  // 總表模式：點擊儲存格循環切換狀態 (未點名 -> 出席 -> 請假 -> 缺席 -> 未點名)
  const handleCycleAttendance = (studentId, sessionId) => {
    const order = ['unmarked', 'present', 'leave', 'absent'];
    const updatedStudents = students.map((st) => {
      if (st.id !== studentId) return st;
      const current = st.attendance?.[sessionId] || 'unmarked';
      const nextStatus = order[(order.indexOf(current) + 1) % order.length];
      return {
        ...st,
        attendance: {
          ...(st.attendance || {}),
          [sessionId]: nextStatus
        }
      };
    });
    saveToCloud(updatedStudents, sessions, tutors);
  };

  // 一鍵全選當日出席
  const handleMarkAllPresent = () => {
    const updatedStudents = students.map((st) => ({
      ...st,
      attendance: {
        ...(st.attendance || {}),
        [selectedSessionId]: 'present'
      }
    }));
    saveToCloud(updatedStudents, sessions, tutors);
    showToast(`已將「${currentSession.label}」全體學生設為出席！`);
  };

  // 重設當日點名狀態
  const handleResetDay = () => {
    setConfirmModal({
      open: true,
      title: '重設當日點名紀錄',
      message: `確定要清空「${currentSession.label}」的所有點名狀態嗎？`,
      onConfirm: () => {
        const updatedStudents = students.map((st) => ({
          ...st,
          attendance: {
            ...(st.attendance || {}),
            [selectedSessionId]: 'unmarked'
          }
        }));
        saveToCloud(updatedStudents, sessions, tutors);
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        showToast(`已重設「${currentSession.label}」的點名狀態`);
      }
    });
  };

  // --- 當日負責導師分配與分科溫習備註邏輯 ---
  const buildCombinedSubjectNotesText = (reviewedSubjects = [], subjectNotes = {}) => {
    return reviewedSubjects
      .map((subj) => {
        const noteStr = (subjectNotes?.[subj] || '').trim();
        return noteStr ? `${subj}：${noteStr}` : `${subj}：已溫習`;
      })
      .join('｜');
  };

  const syncSessionReviewToLogs = (existingLogs = [], sessionId, sessionLabel, sessionData, nowStr) => {
    const logs = Array.isArray(existingLogs) ? [...existingLogs] : [];
    const hasContent =
      (sessionData.tutors && sessionData.tutors.length > 0) ||
      (sessionData.reviewedSubjects && sessionData.reviewedSubjects.length > 0) ||
      Object.values(sessionData.subjectNotes || {}).some((v) => v && v.trim());

    const existingIdx = logs.findIndex((item) => item.sessionId === sessionId);
    if (!hasContent) {
      if (existingIdx !== -1) logs.splice(existingIdx, 1);
      return logs;
    }

    const updatedLogItem = {
      id: existingIdx !== -1 ? logs[existingIdx].id : `rl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      sessionLabel,
      tutors: sessionData.tutors || [],
      reviewedSubjects: sessionData.reviewedSubjects || [],
      subjectNotes: { ...(sessionData.subjectNotes || {}) },
      note: sessionData.note || '',
      updatedAt: nowStr
    };

    if (existingIdx !== -1) {
      logs[existingIdx] = updatedLogItem;
    } else {
      logs.unshift(updatedLogItem);
    }
    return logs;
  };

  const handleToggleSessionTutor = (studentId, sessionId, tutorName) => {
    const nowStr = formatNowDateTime();
    const sessObj = sessions.find((s) => s.id === sessionId) || currentSession;
    const updatedStudents = students.map((st) => {
      if (st.id !== studentId) return st;
      const prevSessionData = st.sessionTutors?.[sessionId] || {
        tutors: [],
        reviewedSubjects: [],
        subjectNotes: {},
        note: '',
        updatedAt: ''
      };
      const currentTutors = Array.isArray(prevSessionData.tutors) ? prevSessionData.tutors : [];
      const exists = currentTutors.includes(tutorName);
      const nextTutors = exists
        ? currentTutors.filter((t) => t !== tutorName)
        : [...currentTutors, tutorName];

      const nextSessionData = {
        ...prevSessionData,
        tutors: nextTutors,
        updatedAt: nowStr
      };

      const nextReviewLogs = syncSessionReviewToLogs(
        st.reviewLogs,
        sessionId,
        sessObj.label,
        nextSessionData,
        nowStr
      );

      return {
        ...st,
        sessionTutors: {
          ...(st.sessionTutors || {}),
          [sessionId]: nextSessionData
        },
        reviewLogs: nextReviewLogs
      };
    });
    saveToCloud(updatedStudents, sessions, tutors);
  };

  // 導師剔選今天溫習了的科目
  const handleToggleReviewedSubject = (studentId, sessionId, subjectName) => {
    const nowStr = formatNowDateTime();
    const sessObj = sessions.find((s) => s.id === sessionId) || currentSession;
    const updatedStudents = students.map((st) => {
      if (st.id !== studentId) return st;
      const prevSessionData = st.sessionTutors?.[sessionId] || {
        tutors: [],
        reviewedSubjects: [],
        subjectNotes: {},
        note: '',
        updatedAt: ''
      };
      const currentSubjs = Array.isArray(prevSessionData.reviewedSubjects)
        ? prevSessionData.reviewedSubjects
        : [];
      const exists = currentSubjs.includes(subjectName);
      const nextReviewedSubjects = exists
        ? currentSubjs.filter((s) => s !== subjectName)
        : [...currentSubjs, subjectName];

      const nextSubjectNotes = { ...(prevSessionData.subjectNotes || {}) };
      if (!exists && typeof nextSubjectNotes[subjectName] === 'undefined') {
        nextSubjectNotes[subjectName] = '';
      }

      const combinedNote = buildCombinedSubjectNotesText(nextReviewedSubjects, nextSubjectNotes);
      const nextSessionData = {
        ...prevSessionData,
        reviewedSubjects: nextReviewedSubjects,
        subjectNotes: nextSubjectNotes,
        note: combinedNote,
        updatedAt: nowStr
      };

      const nextReviewLogs = syncSessionReviewToLogs(
        st.reviewLogs,
        sessionId,
        sessObj.label,
        nextSessionData,
        nowStr
      );

      return {
        ...st,
        sessionTutors: {
          ...(st.sessionTutors || {}),
          [sessionId]: nextSessionData
        },
        reviewLogs: nextReviewLogs
      };
    });
    saveToCloud(updatedStudents, sessions, tutors);
  };

  // 導師在對應溫習科目下方輸入本次溫習備註
  const handleUpdateSubjectReviewNote = (studentId, sessionId, subjectName, noteValue) => {
    const nowStr = formatNowDateTime();
    const sessObj = sessions.find((s) => s.id === sessionId) || currentSession;
    const updatedStudents = students.map((st) => {
      if (st.id !== studentId) return st;
      const prevSessionData = st.sessionTutors?.[sessionId] || {
        tutors: [],
        reviewedSubjects: [],
        subjectNotes: {},
        note: '',
        updatedAt: ''
      };
      const currentSubjs = Array.isArray(prevSessionData.reviewedSubjects)
        ? prevSessionData.reviewedSubjects
        : [];
      const nextReviewedSubjects = currentSubjs.includes(subjectName)
        ? currentSubjs
        : [...currentSubjs, subjectName];

      const nextSubjectNotes = {
        ...(prevSessionData.subjectNotes || {}),
        [subjectName]: noteValue
      };

      const combinedNote = buildCombinedSubjectNotesText(nextReviewedSubjects, nextSubjectNotes);
      const nextSessionData = {
        ...prevSessionData,
        reviewedSubjects: nextReviewedSubjects,
        subjectNotes: nextSubjectNotes,
        note: combinedNote,
        updatedAt: nowStr
      };

      const nextReviewLogs = syncSessionReviewToLogs(
        st.reviewLogs,
        sessionId,
        sessObj.label,
        nextSessionData,
        nowStr
      );

      return {
        ...st,
        sessionTutors: {
          ...(st.sessionTutors || {}),
          [sessionId]: nextSessionData
        },
        reviewLogs: nextReviewLogs
      };
    });
    saveToCloud(updatedStudents, sessions, tutors);
  };

  // 將當日各科溫習備註保存到學生長期資料庫及備註歷史時間軸
  const handleSaveSubjectReviewToDatabase = (studentId, sessionId) => {
    const nowStr = formatNowDateTime();
    const sessObj = sessions.find((s) => s.id === sessionId) || currentSession;
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;

    const sessionData = targetStudent.sessionTutors?.[sessionId] || {
      tutors: [],
      reviewedSubjects: [],
      subjectNotes: {},
      note: ''
    };
    const reviewedSubjects = sessionData.reviewedSubjects || [];
    const assignedTutors = sessionData.tutors || [];

    if (reviewedSubjects.length === 0 && assignedTutors.length === 0) {
      showToast('請先剔選今日負責導師或溫習科目');
      return;
    }

    const tutorPrefix = assignedTutors.length > 0 ? `【導師：${assignedTutors.join('、')}】` : '【溫習紀錄】';
    const combinedText = buildCombinedSubjectNotesText(reviewedSubjects, sessionData.subjectNotes);
    const historyEntryText = `${tutorPrefix}(${sessObj.label}) ${combinedText || '已完成今日課堂溫習'}`;

    const updatedStudents = students.map((st) => {
      if (st.id !== studentId) return st;
      const nextSessionData = {
        ...sessionData,
        note: combinedText,
        updatedAt: nowStr
      };
      const nextReviewLogs = syncSessionReviewToLogs(
        st.reviewLogs,
        sessionId,
        sessObj.label,
        nextSessionData,
        nowStr
      );

      const existingHistory = Array.isArray(st.remarksHistory) ? [...st.remarksHistory] : [];
      const newRemarkEntry = {
        id: `rm_rev_${Date.now()}`,
        text: historyEntryText,
        date: nowStr
      };
      const nextHistory = [newRemarkEntry, ...existingHistory];

      return {
        ...st,
        remarks: historyEntryText,
        remarksHistory: nextHistory,
        sessionTutors: {
          ...(st.sessionTutors || {}),
          [sessionId]: nextSessionData
        },
        reviewLogs: nextReviewLogs
      };
    });

    saveToCloud(updatedStudents, sessions, tutors);
    showToast(`✓ 已將「${targetStudent.name}」的各科溫習備註保存至學生資料庫！`);
  };

  const handleAddNewTutor = (e, assignToStudentId = null) => {
    if (e) e.preventDefault();
    const cleanName = tutorModal.newTutorName.trim();
    if (!cleanName) {
      showToast('請輸入新導師名字');
      return;
    }

    const nextTutors = tutors.includes(cleanName) ? tutors : [...tutors, cleanName];
    let updatedStudents = students;

    if (assignToStudentId) {
      const nowStr = formatNowDateTime();
      const sessObj = sessions.find((s) => s.id === selectedSessionId) || currentSession;
      updatedStudents = students.map((st) => {
        if (st.id !== assignToStudentId) return st;
        const prevSessionData = st.sessionTutors?.[selectedSessionId] || {
          tutors: [],
          reviewedSubjects: [],
          subjectNotes: {},
          note: '',
          updatedAt: ''
        };
        const currentTutors = Array.isArray(prevSessionData.tutors) ? prevSessionData.tutors : [];
        const nextAssigned = currentTutors.includes(cleanName)
          ? currentTutors
          : [...currentTutors, cleanName];
        const nextSessionData = {
          ...prevSessionData,
          tutors: nextAssigned,
          updatedAt: nowStr
        };
        return {
          ...st,
          sessionTutors: {
            ...(st.sessionTutors || {}),
            [selectedSessionId]: nextSessionData
          },
          reviewLogs: syncSessionReviewToLogs(
            st.reviewLogs,
            selectedSessionId,
            sessObj.label,
            nextSessionData,
            nowStr
          )
        };
      });
    }

    saveToCloud(updatedStudents, sessions, nextTutors);
    setTutorModal({ open: false, studentId: null, newTutorName: '' });
    showToast(`已新增導師「${cleanName}」！`);
  };

  // 刪除導師名字
  const handleDeleteTutor = (tutorName) => {
    const nextTutors = tutors.filter((t) => t !== tutorName);
    const updatedStudents = students.map((st) => {
      const nextSessionTutors = {};
      Object.entries(st.sessionTutors || {}).forEach(([sId, sData]) => {
        nextSessionTutors[sId] = {
          ...sData,
          tutors: (sData.tutors || []).filter((t) => t !== tutorName)
        };
      });
      return {
        ...st,
        sessionTutors: nextSessionTutors
      };
    });
    saveToCloud(updatedStudents, sessions, nextTutors);
    showToast(`已從導師名單中移除「${tutorName}」`);
  };

  // --- 學生詳細資料、緊急聯絡人與科目成績 Modal 邏輯 ---
  const handleOpenProfileModal = (student, mode = 'edit') => {
    const normalized = normalizeStudent(student, 0);
    setProfileModal({
      open: true,
      mode,
      data: {
        ...normalized,
        subjectGrades: { ...(normalized.subjectGrades || {}) }
      },
      customSubject: ''
    });
  };

  const handleOpenAddStudent = () => {
    const nowStr = formatNowDateTime();
    const defaultSubjs = activeSubjectsInUse.length > 0
      ? activeSubjectsInUse.slice(0, 3)
      : ['中文', '英文', '數學'];
    const defaultGrades = {};
    defaultSubjs.forEach((s) => {
      defaultGrades[s] = { level: 'good', score: '' };
    });

    setProfileModal({
      open: true,
      mode: 'add',
      customSubject: '',
      data: {
        id: `st_${Date.now()}`,
        order: students.length + 1,
        name: '',
        parentName: '',
        emergencyContactName: '',
        emergencyContactRelation: '家長',
        emergencyContactPhone: '',
        phone: '',
        school: '',
        grade: '小一',
        subjects: defaultSubjs,
        subjectGrades: defaultGrades,
        currentProgress: '',
        progressUpdatedAt: nowStr,
        remarks: '已交回條',
        remarksHistory: [
          { id: `rm_${Date.now()}`, text: '已交回條', date: nowStr }
        ],
        attendance: {},
        sessionTutors: {}
      }
    });
  };

  // 計算在編輯學生視窗中可顯示的科目按鈕：只顯示「目前至少有一位學生選修的科目」＋「此學生目前已勾選的科目」
  const modalAvailableSubjects = useMemo(() => {
    if (!profileModal.data) return activeSubjectsInUse;
    const otherStudentsSubjects = new Set();
    students.forEach((st) => {
      if (st.id !== profileModal.data.id) {
        (st.subjects || []).forEach((s) => {
          if (s && s.trim()) otherStudentsSubjects.add(s.trim());
        });
      }
    });
    (profileModal.data.subjects || []).forEach((s) => {
      if (s && s.trim()) otherStudentsSubjects.add(s.trim());
    });
    return Array.from(otherStudentsSubjects);
  }, [students, profileModal.data, activeSubjectsInUse]);

  const handleToggleSubjectInModal = (subject) => {
    const currentSubjects = profileModal.data.subjects || [];
    const exists = currentSubjects.includes(subject);
    const nextSubjects = exists
      ? currentSubjects.filter((s) => s !== subject)
      : [...currentSubjects, subject];

    const nextGrades = { ...(profileModal.data.subjectGrades || {}) };
    if (!exists && !nextGrades[subject]) {
      nextGrades[subject] = { level: 'good', score: '' };
    }

    setProfileModal({
      ...profileModal,
      data: {
        ...profileModal.data,
        subjects: nextSubjects,
        subjectGrades: nextGrades
      }
    });
  };

  const handleAddCustomSubject = () => {
    const clean = profileModal.customSubject.trim();
    if (!clean) return;
    const currentSubjects = profileModal.data.subjects || [];
    const nextGrades = { ...(profileModal.data.subjectGrades || {}) };
    if (!nextGrades[clean]) {
      nextGrades[clean] = { level: 'good', score: '' };
    }
    if (!currentSubjects.includes(clean)) {
      setProfileModal({
        ...profileModal,
        customSubject: '',
        data: {
          ...profileModal.data,
          subjects: [...currentSubjects, clean],
          subjectGrades: nextGrades
        }
      });
    } else {
      setProfileModal({ ...profileModal, customSubject: '' });
    }
  };

  const handleUpdateSubjectGradeInModal = (subject, field, value) => {
    const prevGrades = profileModal.data.subjectGrades || {};
    const prevSubjGrade = prevGrades[subject] || { level: 'good', score: '' };
    setProfileModal({
      ...profileModal,
      data: {
        ...profileModal.data,
        subjectGrades: {
          ...prevGrades,
          [subject]: {
            ...prevSubjGrade,
            [field]: value
          }
        }
      }
    });
  };

  const handleSaveProfileModal = (e) => {
    e.preventDefault();
    const { mode, data } = profileModal;
    if (!data.name.trim()) {
      showToast('請輸入學生姓名');
      return;
    }

    const nowStr = formatNowDateTime();
    const cleanEmergencyName = (data.emergencyContactName || data.parentName || '').trim() || '—';
    const cleanEmergencyPhone = (data.emergencyContactPhone || '').trim();
    const cleanEmergencyRelation = data.emergencyContactRelation || '家長';

    // 只保留有選修科目的成績設定
    const finalSubjects = data.subjects || [];
    const cleanedSubjectGrades = {};
    finalSubjects.forEach((subj) => {
      cleanedSubjectGrades[subj] = data.subjectGrades?.[subj] || { level: 'good', score: '' };
    });

    let updatedStudents;

    if (mode === 'add') {
      const initialRemarkText = (data.remarks || '已交回條').trim();
      const newStudent = {
        ...data,
        order: students.length + 1,
        name: data.name.trim(),
        parentName: cleanEmergencyName,
        emergencyContactName: cleanEmergencyName,
        emergencyContactRelation: cleanEmergencyRelation,
        emergencyContactPhone: cleanEmergencyPhone,
        phone: cleanEmergencyPhone,
        school: data.school.trim() || '未填寫學校',
        grade: data.grade || '小一',
        subjects: finalSubjects,
        subjectGrades: cleanedSubjectGrades,
        currentProgress: data.currentProgress.trim() || '剛加入小組，待記錄學習進度',
        progressUpdatedAt: nowStr,
        remarks: initialRemarkText,
        remarksHistory: [
          { id: `rm_${Date.now()}`, text: initialRemarkText, date: nowStr }
        ],
        attendance: {},
        sessionTutors: {}
      };
      updatedStudents = [...students, newStudent];
      showToast(`已新增學生「${newStudent.name}」至資料庫`);
    } else {
      updatedStudents = students.map((st) => {
        if (st.id !== data.id) return st;
        const progressChanged = st.currentProgress !== data.currentProgress.trim();
        return {
          ...st,
          name: data.name.trim(),
          parentName: cleanEmergencyName,
          emergencyContactName: cleanEmergencyName,
          emergencyContactRelation: cleanEmergencyRelation,
          emergencyContactPhone: cleanEmergencyPhone,
          phone: cleanEmergencyPhone,
          school: data.school.trim() || '未填寫學校',
          grade: data.grade || '未設定',
          subjects: finalSubjects,
          subjectGrades: cleanedSubjectGrades,
          currentProgress: data.currentProgress.trim() || '尚未填寫最新學習進度',
          progressUpdatedAt: progressChanged ? nowStr : (st.progressUpdatedAt || nowStr)
        };
      });
      showToast(`已更新「${data.name.trim()}」的學生檔案、科目成績與學習進度`);
    }

    saveToCloud(updatedStudents, sessions, tutors);
    setProfileModal({ open: false, mode: 'view', data: null, customSubject: '' });
  };

  const handleDeleteStudent = (student) => {
    setConfirmModal({
      open: true,
      title: '刪除學生資料',
      message: `確定要從名單與資料庫中刪除「${student.name}」嗎？此操作將會移除該學生的所有出席、學習進度與備註紀錄。`,
      onConfirm: () => {
        const filtered = students
          .filter((st) => st.id !== student.id)
          .map((st, idx) => ({ ...st, order: idx + 1 }));
        saveToCloud(filtered, sessions, tutors);
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        showToast(`已移除學生：${student.name}`);
      }
    });
  };

  // --- 備註歷史時間軸 (Remarks History) 邏輯 ---
  const activeRemarksStudent = useMemo(
    () => students.find((st) => st.id === remarksModal.studentId) || null,
    [students, remarksModal.studentId]
  );

  const handleOpenRemarksModal = (student) => {
    setRemarksModal({
      open: true,
      studentId: student.id,
      newText: '',
      newDate: formatNowDateTime(),
      editingHistoryId: null,
      editingText: '',
      editingDate: ''
    });
  };

  const handleAddRemarkEntry = (e) => {
    e.preventDefault();
    if (!remarksModal.newText.trim() || !activeRemarksStudent) {
      showToast('請輸入備註內容');
      return;
    }

    const entryDate = remarksModal.newDate.trim() || formatNowDateTime();
    const newEntry = {
      id: `rm_${Date.now()}`,
      text: remarksModal.newText.trim(),
      date: entryDate
    };

    const updatedStudents = students.map((st) => {
      if (st.id !== activeRemarksStudent.id) return st;
      const existingHistory = Array.isArray(st.remarksHistory) ? st.remarksHistory : [];
      const nextHistory = [newEntry, ...existingHistory];
      return {
        ...st,
        remarks: nextHistory[0].text,
        remarksHistory: nextHistory
      };
    });

    saveToCloud(updatedStudents, sessions, tutors);
    setRemarksModal((prev) => ({
      ...prev,
      newText: '',
      newDate: formatNowDateTime()
    }));
    showToast('已新增備註並同步至歷史紀錄');
  };

  const handleSaveEditedRemarkEntry = (entryId) => {
    if (!remarksModal.editingText.trim() || !activeRemarksStudent) return;

    const updatedStudents = students.map((st) => {
      if (st.id !== activeRemarksStudent.id) return st;
      const nextHistory = (st.remarksHistory || []).map((item) =>
        item.id === entryId
          ? { ...item, text: remarksModal.editingText.trim(), date: remarksModal.editingDate.trim() || item.date }
          : item
      );
      return {
        ...st,
        remarks: nextHistory[0]?.text || '',
        remarksHistory: nextHistory
      };
    });

    saveToCloud(updatedStudents, sessions, tutors);
    setRemarksModal((prev) => ({ ...prev, editingHistoryId: null, editingText: '', editingDate: '' }));
    showToast('已更新該筆備註紀錄');
  };

  const handleDeleteRemarkEntry = (entryId) => {
    if (!activeRemarksStudent) return;
    const updatedStudents = students.map((st) => {
      if (st.id !== activeRemarksStudent.id) return st;
      const nextHistory = (st.remarksHistory || []).filter((item) => item.id !== entryId);
      return {
        ...st,
        remarks: nextHistory[0]?.text || '尚無備註',
        remarksHistory: nextHistory
      };
    });
    saveToCloud(updatedStudents, sessions, tutors);
    showToast('已刪除該筆備註紀錄');
  };

  // --- 課堂日期設定 ---
  const handleOpenEditSession = (session) => {
    setSessionModal({
      open: true,
      session,
      newLabel: session.label.startsWith('自訂堂次') ? '' : session.label
    });
  };

  const handleSaveSessionModal = (e) => {
    e.preventDefault();
    const { session, newLabel } = sessionModal;
    const cleanLabel = newLabel.trim() || session.label;
    const updatedSessions = sessions.map((s) =>
      s.id === session.id ? { ...s, label: cleanLabel } : s
    );
    saveToCloud(students, updatedSessions, tutors);
    setSessionModal({ open: false, session: null, newLabel: '' });
    showToast(`已更新課堂日期為：${cleanLabel}`);
  };

  // --- 輔助計算：取得學生需要加強的科目清單 ---
  const getStudentWeakSubjects = (student) => {
    const subjs = student.subjects || [];
    const grades = student.subjectGrades || {};
    return subjs
      .map((subj) => ({
        subject: subj,
        level: grades[subj]?.level || 'good',
        score: grades[subj]?.score || ''
      }))
      .filter((item) => item.level === 'critical' || item.level === 'warning')
      .sort((a, b) => (PERFORMANCE_LEVELS[a.level]?.priority || 9) - (PERFORMANCE_LEVELS[b.level]?.priority || 9));
  };

  // --- 統計計算 ---
  const dailyStats = useMemo(() => {
    let present = 0;
    let leave = 0;
    let absent = 0;
    let unmarked = 0;

    students.forEach((st) => {
      const status = st.attendance?.[selectedSessionId] || 'unmarked';
      if (status === 'present') present++;
      else if (status === 'leave') leave++;
      else if (status === 'absent') absent++;
      else unmarked++;
    });

    return { present, leave, absent, unmarked, total: students.length };
  }, [students, selectedSessionId]);

  const getStudentTotalPresent = (student) => {
    if (!student.attendance) return 0;
    return Object.values(student.attendance).filter((v) => v === 'present').length;
  };

  const getStudentTotalMarkedSessions = (student) => {
    if (!student.attendance) return 0;
    return Object.values(student.attendance).filter((v) => v && v !== 'unmarked').length;
  };

  const getSessionPresentCount = (sessionId) => {
    return students.filter((st) => st.attendance?.[sessionId] === 'present').length;
  };

  // 篩選後的學生資料庫清單
  const filteredDatabaseStudents = useMemo(() => {
    return students.filter((st) => {
      const q = dbSearchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        st.name?.toLowerCase().includes(q) ||
        st.school?.toLowerCase().includes(q) ||
        st.grade?.toLowerCase().includes(q) ||
        st.currentProgress?.toLowerCase().includes(q) ||
        st.emergencyContactName?.toLowerCase().includes(q) ||
        st.emergencyContactPhone?.toLowerCase().includes(q) ||
        st.parentName?.toLowerCase().includes(q) ||
        st.remarks?.toLowerCase().includes(q);
      const matchSubject =
        dbSubjectFilter === 'ALL' || (st.subjects || []).includes(dbSubjectFilter);
      const weakList = getStudentWeakSubjects(st);
      const matchPerformance =
        dbPerformanceFilter === 'ALL' ||
        (dbPerformanceFilter === 'NEEDS_HELP' && weakList.length > 0);
      return matchQuery && matchSubject && matchPerformance;
    });
  }, [students, dbSearchQuery, dbSubjectFilter, dbPerformanceFilter]);

  // --- 匯出 CSV / Excel 報表功能 (包含緊急聯絡人、各科成績表現、當日溫習導師與分科溫習備註) ---
  const handleExportCSV = () => {
    const statusMap = {
      present: '✓ 出席',
      leave: '請假',
      absent: '缺席',
      unmarked: ''
    };

    const rows = [
      ['G.R.E.E.N. 和樂閱覽中心 — 2026-2027 年度第一季學習成長小組 點名暨學生學習進度資料庫'],
      ['常規時間：逢每月第一及三個星期六 3:00pm - 5:00pm ｜ 已報名人數：' + students.length + '人'],
      [],
      [
        '序號',
        '學生姓名',
        '緊急聯絡人姓名',
        '關係',
        '緊急聯絡人電話',
        '就讀學校',
        '年級',
        '修讀科目及成績表現',
        '需加強科目提示',
        '當前學習進度（現在學到哪裡）',
        '進度更新時間',
        ...sessions.map((s) => `${s.label} (出席及分科溫習紀錄)`),
        '出席堂數',
        '最新備註',
        '最新備註日期',
        '長期分科溫習紀錄庫',
        '完整備註歷史紀錄'
      ]
    ];

    students.forEach((st, index) => {
      const sessionCells = sessions.map((s) => {
        const val = st.attendance?.[s.id] || 'unmarked';
        const attText = statusMap[val] || '';
        const tutorInfo = st.sessionTutors?.[s.id];
        const tutorNames = tutorInfo?.tutors?.length ? ` [導師:${tutorInfo.tutors.join('/')}]` : '';
        const subjNotesStr =
          tutorInfo?.reviewedSubjects?.length > 0
            ? ` (${buildCombinedSubjectNotesText(tutorInfo.reviewedSubjects, tutorInfo.subjectNotes)})`
            : tutorInfo?.note
            ? ` (${tutorInfo.note})`
            : '';
        return `${attText}${tutorNames}${subjNotesStr}`.trim();
      });

      const totalPresent = getStudentTotalPresent(st);
      const historyList = Array.isArray(st.remarksHistory) ? st.remarksHistory : [];
      const latestRemarkObj = historyList[0] || { text: st.remarks || '', date: '' };
      const fullHistoryText = historyList
        .map((h) => `[${h.date}] ${h.text}`)
        .join(' ｜ ');

      const fullReviewLogsText = (st.reviewLogs || [])
        .map((log) => {
          const tStr = log.tutors?.length ? `導師:${log.tutors.join('/')}` : '導師溫習';
          const sStr =
            log.reviewedSubjects?.length > 0
              ? buildCombinedSubjectNotesText(log.reviewedSubjects, log.subjectNotes)
              : log.note || '';
          return `[${log.sessionLabel} ${log.updatedAt || ''}] ${tStr} - ${sStr}`;
        })
        .join(' ； ');

      const subjectsWithGrades = (st.subjects || [])
        .map((subj) => {
          const g = st.subjectGrades?.[subj] || { level: 'good', score: '' };
          const lvlLabel = PERFORMANCE_LEVELS[g.level]?.label || '表現平穩';
          return `${subj}:${lvlLabel}${g.score ? `(${g.score})` : ''}`;
        })
        .join('；');

      const weakSubjectsText = getStudentWeakSubjects(st)
        .map((w) => `${w.subject}[${PERFORMANCE_LEVELS[w.level]?.label}${w.score ? `:${w.score}` : ''}]`)
        .join('、') || '各科表現平穩';

      rows.push([
        index + 1,
        st.name,
        st.emergencyContactName || st.parentName || '',
        st.emergencyContactRelation || '家長',
        st.emergencyContactPhone || st.phone || '',
        st.school || '',
        st.grade || '',
        subjectsWithGrades,
        weakSubjectsText,
        st.currentProgress || '',
        st.progressUpdatedAt || '',
        ...sessionCells,
        totalPresent,
        latestRemarkObj.text,
        latestRemarkObj.date,
        fullReviewLogsText,
        fullHistoryText
      ]);
    });

    // 底部當日出席人數小計
    const summaryCells = sessions.map((s) => getSessionPresentCount(s.id));
    const grandTotalPresent = summaryCells.reduce((acc, cur) => acc + cur, 0);
    rows.push([]);
    rows.push([
      '',
      '當日出席人數小計：',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ...summaryCells,
      grandTotalPresent,
      '',
      '',
      '',
      ''
    ]);

    // 轉換為 CSV 字串 (含 UTF-8 BOM 以支援 Excel 直接開啟中文不亂碼)
    const csvContent =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `GREEN_2026-2027_學生點名及學習進度資料庫_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('已匯出完整 Excel (CSV) 點名與學生資料庫報表！');
  };

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-stone-800 pb-28 font-sans selection:bg-emerald-200">
      {/* 頂部浮動 Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 頂部 GREEN 森林綠主題標頭 */}
      <header className="bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#1B4332] text-white shadow-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 pt-3.5 pb-3">
          {/* 第一列：機構名稱與即時多機連線狀態 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400/20 border border-emerald-300/30 text-emerald-100 text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wide flex items-center gap-1.5">
                {isCloudLive ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ) : (
                  <span className="inline-block w-2 h-2 rounded-full bg-stone-400" />
                )}
                G.R.E.E.N. 和樂閱覽中心
              </span>
            </div>

            {/* 雲端即時連線狀態標籤 */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-black/25 px-2.5 py-1 rounded-full text-xs text-emerald-100">
                {saveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>即時同步中...</span>
                  </>
                ) : isCloudLive ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                    <span>多機即時連線 ({lastSavedTime})</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                    <span>離線備份模式</span>
                  </>
                )}
              </div>
              <button
                onClick={handleManualSave}
                className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-emerald-950 font-bold text-xs px-2.5 py-1 rounded-full transition flex items-center gap-1 shadow-sm"
                title="強制同步"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>同步</span>
              </button>
            </div>
          </div>

          {/* 第二列：主標題與展開活動資訊按鈕 */}
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-snug text-white">
                2026-2027 年度第一季學習成長小組
              </h1>
              <p className="text-xs text-emerald-100/90 mt-0.5 flex items-center gap-2">
                <span>常規時間：逢每月第一及三個星期六 3:00pm - 5:00pm</span>
              </p>
            </div>

            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-emerald-100 transition flex items-center gap-1 text-xs font-medium shrink-0"
              aria-label="展開活動詳情"
            >
              <Info className="w-4 h-4" />
              <span className="hidden xs:inline">詳情</span>
              {showInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* 可收合的活動詳細資訊欄 */}
          {showInfo && (
            <div className="mt-3 pt-3 border-t border-emerald-400/20 text-xs text-emerald-50 space-y-1.5 bg-black/15 p-3 rounded-xl">
              <div className="flex justify-between">
                <span className="text-emerald-200">活動名稱：</span>
                <span className="font-medium text-right">2026-2027 年度第一季學習成長小組</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200">常規時間：</span>
                <span>逢每月第一及三個星期六 3:00pm - 5:00pm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200">目前報名人數：</span>
                <span className="font-semibold text-emerald-300">{students.length} 人（支援最多 15 人以上）</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        {/* ==================== 模式一：單日快速點名 ==================== */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            {/* 1. 課堂日期橫向滑動選擇器 */}
            <section className="bg-white rounded-2xl p-3.5 shadow-sm border border-stone-200/80">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
                  <Calendar className="w-4 h-4 text-[#2D6A4F]" />
                  <span>選擇上課日期（點擊切換）</span>
                </div>
                <button
                  onClick={() => handleOpenEditSession(currentSession)}
                  className="text-xs text-[#2D6A4F] hover:text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg active:scale-95 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>修改日期：{currentSession.label}</span>
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                {sessions.map((s) => {
                  const isSelected = s.id === selectedSessionId;
                  const count = getSessionPresentCount(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`shrink-0 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all flex flex-col items-center justify-center min-w-[92px] min-h-[54px] border ${
                        isSelected
                          ? 'bg-[#2D6A4F] text-white border-[#1B4332] shadow-md scale-[1.02]'
                          : s.isCustom
                          ? 'bg-stone-50 text-stone-600 border-dashed border-stone-300 hover:bg-stone-100'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span className="font-bold whitespace-nowrap">{s.label}</span>
                      <span
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-emerald-100' : 'text-stone-400'
                        }`}
                      >
                        出席 {count}/{students.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. 當日出席統計與一鍵全選工具列 */}
            <section className="bg-white rounded-2xl p-3.5 shadow-sm border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    當日出席統計
                  </span>
                  <span className="text-xs font-bold text-[#2D6A4F] bg-emerald-50 px-2 py-0.5 rounded-md">
                    {currentSession.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="text-lg font-extrabold text-stone-800">
                    出席 <span className="text-emerald-600 text-xl">{dailyStats.present}</span> / {dailyStats.total} 人
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">
                      請假 {dailyStats.leave}
                    </span>
                    <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-medium">
                      缺席 {dailyStats.absent}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleMarkAllPresent}
                  className="flex-1 sm:flex-initial bg-[#2D6A4F] hover:bg-[#1B4332] active:scale-95 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>一鍵全選出席</span>
                </button>
                <button
                  onClick={handleResetDay}
                  className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-100 active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="重設當日點名"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* 3. 學生大卡片點名列表（乾淨簡潔版：只保留學生姓名、學生資料按鈕、緊急聯絡人資料） */}
            <section className="space-y-3.5">
              {students.map((student, index) => {
                const status = student.attendance?.[selectedSessionId] || 'unmarked';
                const totalPresent = getStudentTotalPresent(student);
                const historyList = Array.isArray(student.remarksHistory) ? student.remarksHistory : [];
                const latestRemarkObj = historyList[0] || {
                  text: student.remarks || '點擊新增備註...',
                  date: '2026-09-19'
                };
                const todayTutorData = student.sessionTutors?.[selectedSessionId] || {
                  tutors: [],
                  reviewedSubjects: [],
                  subjectNotes: {},
                  note: '',
                  updatedAt: ''
                };
                const assignedTutors = Array.isArray(todayTutorData.tutors) ? todayTutorData.tutors : [];
                const reviewedSubjects = Array.isArray(todayTutorData.reviewedSubjects)
                  ? todayTutorData.reviewedSubjects
                  : [];
                const subjectNotes = todayTutorData.subjectNotes || {};

                // 該學生可剔選的溫習科目清單（學生本身修讀科目 + 已剔選科目）
                const studentSubjectChoices = Array.from(
                  new Set([...(student.subjects || []), ...reviewedSubjects])
                );

                // 依據點名狀態設定卡片邊框視覺提示
                const cardBorderClass =
                  status === 'present'
                    ? 'border-l-4 border-l-emerald-500 border-stone-200'
                    : status === 'leave'
                    ? 'border-l-4 border-l-amber-400 border-stone-200'
                    : status === 'absent'
                    ? 'border-l-4 border-l-rose-500 border-stone-200'
                    : 'border-l-4 border-l-stone-300 border-stone-200';

                return (
                  <div
                    key={student.id}
                    className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${cardBorderClass}`}
                  >
                    {/* 乾淨簡潔頂部：只顯示序號、學生姓名、「學生資料」按鈕、緊急聯絡人姓名與電話 */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-full bg-emerald-900/10 text-[#1B4332] font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-bold text-stone-900 leading-tight">
                              {student.name}
                            </h2>
                            {/* 學生名字旁邊的「學生資料」按鈕 */}
                            <button
                              type="button"
                              onClick={() => handleOpenProfileModal(student, 'edit')}
                              className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100/90 hover:bg-emerald-200 text-[#1B4332] px-2.5 py-1 rounded-full border border-emerald-300/80 active:scale-95 transition shadow-2xs"
                              title="查看及編輯學校、年級、緊急聯絡人、科目成績與學習進度"
                            >
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                              <span>學生資料</span>
                            </button>
                          </div>

                          {/* 緊急聯絡人與電話直撥列 */}
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-stone-600">
                            <span className="font-medium text-stone-700">
                              聯絡人：{student.emergencyContactName || student.parentName}
                              {student.emergencyContactRelation ? `（${student.emergencyContactRelation}）` : ''}
                            </span>
                            {student.emergencyContactPhone && (
                              <a
                                href={`tel:${student.emergencyContactPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold transition"
                                title="點擊直接撥打聯絡人電話"
                              >
                                <Phone className="w-3 h-3 text-emerald-700" />
                                <span>{student.emergencyContactPhone}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                          出席：{totalPresent} 堂
                        </span>
                      </div>
                    </div>

                    {/* 四大觸控點名按鈕（符合人體工學 >= 48px 高度） */}
                    <div className="grid grid-cols-4 gap-2 my-2">
                      {/* 出席按鈕 */}
                      <button
                        type="button"
                        onClick={() => handleSetAttendance(student.id, 'present')}
                        className={`min-h-[50px] rounded-xl font-bold text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition active:scale-95 border ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-600/20'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>✓ 出席</span>
                      </button>

                      {/* 請假按鈕 */}
                      <button
                        type="button"
                        onClick={() => handleSetAttendance(student.id, 'leave')}
                        className={`min-h-[50px] rounded-xl font-bold text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition active:scale-95 border ${
                          status === 'leave'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>請假</span>
                      </button>

                      {/* 缺席按鈕 */}
                      <button
                        type="button"
                        onClick={() => handleSetAttendance(student.id, 'absent')}
                        className={`min-h-[50px] rounded-xl font-bold text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition active:scale-95 border ${
                          status === 'absent'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-600/20'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>缺席</span>
                      </button>

                      {/* 未點名按鈕 */}
                      <button
                        type="button"
                        onClick={() => handleSetAttendance(student.id, 'unmarked')}
                        className={`min-h-[50px] rounded-xl font-medium text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition active:scale-95 border ${
                          status === 'unmarked'
                            ? 'bg-stone-200 text-stone-800 border-stone-300 font-bold'
                            : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <MinusCircle className="w-4 h-4 shrink-0" />
                        <span>未點名</span>
                      </button>
                    </div>

                    {/* ==================== 負責溫習導師（支援新增/刪除）＋ 剔選今日溫習科目與分科獨立備註 ==================== */}
                    <div className="mt-3 bg-emerald-50/45 border border-emerald-200/80 rounded-xl p-3 space-y-3">
                      {/* 第一步：選擇或管理負責溫習導師 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B4332]">
                            <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>1. {currentSession.label} 負責溫習導師：</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setTutorModal({ open: true, studentId: student.id, newTutorName: '' })
                              }
                              className="text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>新增導師</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setManageTutorsMode(!manageTutorsMode)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border active:scale-95 transition ${
                                manageTutorsMode
                                  ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                              }`}
                              title="開啟或關閉刪除導師模式"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{manageTutorsMode ? '完成管理' : '刪除導師'}</span>
                            </button>
                          </div>
                        </div>

                        {/* 導師膠囊按鈕清單（管理模式下可直接點擊 × 刪除導師） */}
                        <div className="flex flex-wrap gap-1.5">
                          {tutors.map((tutorName) => {
                            const isAssigned = assignedTutors.includes(tutorName);
                            return (
                              <div key={tutorName} className="inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    manageTutorsMode
                                      ? handleDeleteTutor(tutorName)
                                      : handleToggleSessionTutor(student.id, selectedSessionId, tutorName)
                                  }
                                  className={`px-2.5 py-1.5 text-xs font-bold transition active:scale-95 border flex items-center gap-1 ${
                                    manageTutorsMode
                                      ? 'rounded-lg bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                      : isAssigned
                                      ? 'rounded-lg bg-[#2D6A4F] text-white border-[#1B4332] shadow-2xs'
                                      : 'rounded-lg bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                  }`}
                                >
                                  <span>{isAssigned && !manageTutorsMode ? `✓ ${tutorName}` : tutorName}</span>
                                  {manageTutorsMode && (
                                    <X className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 第二步：剔選今天溫習了的科目 */}
                      <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#1B4332] flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                            <span>2. 剔選今天溫習了的科目（勾選後在下方填寫該科備註）：</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {studentSubjectChoices.map((subj) => {
                            const isChecked = reviewedSubjects.includes(subj);
                            return (
                              <button
                                key={subj}
                                type="button"
                                onClick={() =>
                                  handleToggleReviewedSubject(student.id, selectedSessionId, subj)
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 flex items-center gap-1.5 ${
                                  isChecked
                                    ? 'bg-emerald-700 text-white border-emerald-900 shadow-2xs'
                                    : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                }`}
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                                    isChecked
                                      ? 'bg-white text-emerald-800 border-white font-extrabold'
                                      : 'border-stone-300 bg-stone-50 text-transparent'
                                  }`}
                                >
                                  ✓
                                </span>
                                <span>{subj}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 第三步：在每個已剔選的科目下面，各自顯示一行「本次溫習備註」並可保存至資料庫 */}
                      {reviewedSubjects.length > 0 && (
                        <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                          <div className="text-[11px] font-bold text-stone-600">
                            3. 各科本次溫習備註（自動同步，亦可點擊下方按鈕寫入長期歷史紀錄）：
                          </div>

                          <div className="space-y-2">
                            {reviewedSubjects.map((subj) => (
                              <div
                                key={subj}
                                className="flex flex-col sm:flex-row sm:items-center gap-1.5 bg-white p-2 rounded-xl border border-emerald-200/90 shadow-2xs"
                              >
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-100 text-[#1B4332] font-extrabold text-xs shrink-0 sm:min-w-[64px]">
                                  {subj}
                                </span>
                                <input
                                  type="text"
                                  value={subjectNotes[subj] || ''}
                                  onChange={(e) =>
                                    handleUpdateSubjectReviewNote(
                                      student.id,
                                      selectedSessionId,
                                      subj,
                                      e.target.value
                                    )
                                  }
                                  placeholder={`輸入「${subj}」本次溫習備註（如：完成工作紙、默書進度、需補強處）...`}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[11px] text-stone-400">
                              {todayTutorData.updatedAt ? `最後更新：${todayTutorData.updatedAt}` : '輸入後自動保存'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveSubjectReviewToDatabase(student.id, selectedSessionId)
                              }
                              className="bg-[#2D6A4F] hover:bg-[#1B4332] active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>保存溫習紀錄至學生資料庫</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 最新備註欄（點擊可查看舊備註歷史與添加日期） */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => handleOpenRemarksModal(student)}
                        className="w-full text-left flex items-center justify-between gap-2 text-xs text-stone-600 hover:text-stone-900 py-1.5 px-2.5 -mx-1 rounded-xl hover:bg-amber-50/60 active:scale-[0.99] transition group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-stone-700">最新備註：</span>
                            <span className="text-stone-800 font-medium truncate">
                              {latestRemarkObj.text}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                            <span>更新日期：{latestRemarkObj.date || '2026-09-19'}</span>
                          </div>
                        </div>

                        <span className="shrink-0 inline-flex items-center gap-1 bg-amber-100/80 group-hover:bg-amber-200 text-amber-900 font-bold px-2.5 py-1 rounded-lg text-[11px] transition">
                          <History className="w-3.5 h-3.5 text-amber-700" />
                          <span>歷史紀錄 ({historyList.length})</span>
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* 底部快速新增學生與匯出按鈕 */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleOpenAddStudent}
                className="flex-1 bg-white hover:bg-emerald-50/50 text-[#1B4332] border-2 border-dashed border-emerald-600/40 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-98 min-h-[48px]"
              >
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <span>+ 新增額外學生（目前 {students.length} 人）</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition active:scale-98 min-h-[48px]"
              >
                <Download className="w-5 h-5" />
                <span>匯出 Excel 報表</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== 模式二：總表統計及管理 ==================== */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            {/* 頂部操作面板 */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#2D6A4F]" />
                  <span>全季點名總表與管理</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  點擊學生名字旁「資料」可檢視學校及進度；點擊「備註」可翻查歷次舊備註與添加日期。
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleOpenAddStudent}
                  className="flex-1 sm:flex-initial bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增學生</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>匯出 CSV / Excel</span>
                </button>
              </div>
            </section>

            {/* 模擬原 Excel 的橫向滾動點名矩陣 */}
            <section className="bg-white rounded-2xl shadow-sm border border-stone-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#1B4332] text-white text-xs">
                      <th className="py-3 px-2.5 font-semibold text-center w-10 sticky left-0 bg-[#1B4332] z-10">
                        序號
                      </th>
                      <th className="py-3 px-3 font-semibold sticky left-10 bg-[#1B4332] z-10 min-w-[155px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                        學生 / 學校資料
                      </th>
                      {sessions.map((s) => (
                        <th
                          key={s.id}
                          onClick={() => handleOpenEditSession(s)}
                          className="py-2.5 px-2 font-semibold text-center cursor-pointer hover:bg-emerald-800 transition min-w-[78px]"
                          title="點擊修改課堂日期"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{s.label}</span>
                            <Edit3 className="w-3 h-3 text-emerald-300 opacity-80" />
                          </div>
                          {s.isCustom && (
                            <span className="block text-[10px] text-emerald-200/80 font-normal">
                              點擊設定日期
                            </span>
                          )}
                        </th>
                      ))}
                      <th className="py-3 px-2.5 font-semibold text-center bg-emerald-950 min-w-[76px]">
                        出席堂數
                      </th>
                      <th className="py-3 px-3 font-semibold min-w-[220px]">
                        最新備註（點擊查看舊備註）
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {students.map((st, idx) => {
                      const presentCount = getStudentTotalPresent(st);
                      const markedCount = getStudentTotalMarkedSessions(st);
                      const rate =
                        markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 100;
                      const historyList = Array.isArray(st.remarksHistory) ? st.remarksHistory : [];
                      const latestRemarkObj = historyList[0] || { text: st.remarks || '—', date: '' };

                      return (
                        <tr key={st.id} className="hover:bg-stone-50/80 transition">
                          <td className="py-3 px-2.5 text-center font-bold text-stone-500 sticky left-0 bg-white z-10">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 sticky left-10 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-stone-900">{st.name}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenProfileModal(st, 'edit')}
                                className="inline-flex items-center gap-0.5 text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-[#1B4332] px-2 py-0.5 rounded-full border border-emerald-300 transition"
                                title="查看學生學校、緊急聯絡人、各科成績表現與目前進度"
                              >
                                <GraduationCap className="w-3 h-3" />
                                <span>資料</span>
                              </button>
                            </div>
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              {st.grade}｜{st.school}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              緊急聯絡：{st.emergencyContactName || st.parentName}{' '}
                              {st.emergencyContactPhone ? `(${st.emergencyContactPhone})` : ''}
                            </div>
                          </td>

                          {/* 各堂出席狀態格 + 當日負責導師小標籤 */}
                          {sessions.map((s) => {
                            const status = st.attendance?.[s.id] || 'unmarked';
                            const sessionTutorObj = st.sessionTutors?.[s.id];
                            const assignedList = sessionTutorObj?.tutors || [];
                            return (
                              <td
                                key={s.id}
                                onClick={() => handleCycleAttendance(st.id, s.id)}
                                className="p-1.5 text-center cursor-pointer select-none align-middle"
                                title="點擊切換：出席 / 請假 / 缺席 / 未點名"
                              >
                                {status === 'present' && (
                                  <span className="inline-flex items-center justify-center w-full py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                                    ✓ 出席
                                  </span>
                                )}
                                {status === 'leave' && (
                                  <span className="inline-flex items-center justify-center w-full py-1.5 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-300">
                                    請假
                                  </span>
                                )}
                                {status === 'absent' && (
                                  <span className="inline-flex items-center justify-center w-full py-1.5 rounded-lg bg-rose-100 text-rose-800 font-bold border border-rose-300">
                                    缺席
                                  </span>
                                )}
                                {status === 'unmarked' && (
                                  <span className="inline-flex items-center justify-center w-full py-1.5 rounded-lg bg-stone-50 text-stone-300 hover:bg-stone-100 border border-dashed border-stone-200">
                                    —
                                  </span>
                                )}
                                {assignedList.length > 0 && (
                                  <div
                                    className="mt-1 text-[10px] text-emerald-800 bg-emerald-50 rounded px-1 py-0.5 font-semibold truncate max-w-[90px] mx-auto"
                                    title={
                                      sessionTutorObj?.note
                                        ? `導師：${assignedList.join('、')}｜備註：${sessionTutorObj.note}`
                                        : `導師：${assignedList.join('、')}`
                                    }
                                  >
                                    導師:{assignedList.join('/')}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* 累計出席堂數與出席率 */}
                          <td className="py-3 px-2.5 text-center bg-emerald-50/40 font-bold">
                            <span className="text-sm text-[#1B4332]">{presentCount} 堂</span>
                            {markedCount > 0 && (
                              <span className="block text-[10px] text-emerald-700 font-normal">
                                出席率 {rate}%
                              </span>
                            )}
                          </td>

                          {/* 備註歷史觸發與刪除按鈕 */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenRemarksModal(st)}
                                className="text-left flex-1 p-1.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 transition group"
                                title="點擊查看完整備註歷史與添加日期"
                              >
                                <div className="text-stone-800 font-medium line-clamp-1 group-hover:text-amber-900">
                                  {latestRemarkObj.text}
                                </div>
                                <div className="text-[10px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{latestRemarkObj.date}</span>
                                  <span className="text-amber-700 font-bold bg-amber-100/70 px-1.5 rounded">
                                    共 {historyList.length} 條紀錄
                                  </span>
                                </div>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleDeleteStudent(st)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="刪除學生"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 font-bold text-xs text-stone-800 border-t-2 border-stone-300">
                      <td className="py-3 px-2 text-center sticky left-0 bg-stone-100 z-10">—</td>
                      <td className="py-3 px-3 sticky left-10 bg-stone-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        當日出席人數小計
                      </td>
                      {sessions.map((s) => (
                        <td key={s.id} className="py-3 px-2 text-center text-[#1B4332] text-sm">
                          {getSessionPresentCount(s.id)} 人
                        </td>
                      ))}
                      <td className="py-3 px-2 text-center bg-emerald-100 text-[#1B4332] text-sm">
                        共 {sessions.reduce((acc, s) => acc + getSessionPresentCount(s.id), 0)} 人次
                      </td>
                      <td className="py-3 px-3 text-stone-500 font-normal">
                        自動統計各堂出席人次（扣除請假及缺席）
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ==================== 模式三：學生資料庫 ==================== */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#2D6A4F]" />
                    <span>學生學習進度與緊急聯絡資料庫</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    集中查閱各學生的緊急聯絡人、科目成績強弱項、目前學習進度與歷史備註。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenAddStudent}
                    className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>新增學生</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>匯出資料庫</span>
                  </button>
                </div>
              </div>

              {/* 搜尋框與動態科目篩選（只顯示至少有一人選修的科目） */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={dbSearchQuery}
                      onChange={(e) => setDbSearchQuery(e.target.value)}
                      placeholder="搜尋學生姓名、緊急聯絡人、電話、學校、年級或進度..."
                      className="w-full pl-9 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    {dbSearchQuery && (
                      <button
                        onClick={() => setDbSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 快速篩選：急需加強 / 需多留意學生 */}
                  <button
                    type="button"
                    onClick={() =>
                      setDbPerformanceFilter(
                        dbPerformanceFilter === 'NEEDS_HELP' ? 'ALL' : 'NEEDS_HELP'
                      )
                    }
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition shrink-0 ${
                      dbPerformanceFilter === 'NEEDS_HELP'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>只看需加強學生</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[11px] font-bold text-stone-400 shrink-0 mr-1">
                    修讀科目篩選（無人選修自動隱藏）：
                  </span>
                  <button
                    onClick={() => setDbSubjectFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                      dbSubjectFilter === 'ALL'
                        ? 'bg-[#2D6A4F] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    全部 ({students.length})
                  </button>
                  {activeSubjectsInUse.map((subj) => {
                    const count = students.filter((s) => (s.subjects || []).includes(subj)).length;
                    return (
                      <button
                        key={subj}
                        onClick={() => setDbSubjectFilter(subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                          dbSubjectFilter === subj
                            ? 'bg-[#2D6A4F] text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {subj} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 學生資料庫詳細卡片列表 */}
            <section className="space-y-3">
              {filteredDatabaseStudents.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-stone-200/80 text-stone-500 text-sm">
                  找不到符合篩選條件的學生資料。
                </div>
              ) : (
                filteredDatabaseStudents.map((st, idx) => {
                  const historyList = Array.isArray(st.remarksHistory) ? st.remarksHistory : [];
                  const latestRemarkObj = historyList[0] || { text: st.remarks || '尚無備註', date: '' };
                  const presentCount = getStudentTotalPresent(st);
                  const weakSubjects = getStudentWeakSubjects(st);
                  const sessionTutorEntries = Object.entries(st.sessionTutors || {}).filter(
                    ([, val]) => (val?.tutors && val.tutors.length > 0) || val?.note
                  );

                  return (
                    <div
                      key={st.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200/90 space-y-3 hover:border-emerald-400/60 transition"
                    >
                      {/* 頂部：姓名、學校年級徽章、緊急聯絡人專區、編輯按鈕 */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-extrabold text-stone-900">
                                {st.name}
                              </h3>
                              <span className="bg-emerald-100 text-[#1B4332] text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {st.grade || '未設定年級'}
                              </span>
                              <span className="bg-stone-100 text-stone-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <School className="w-3.5 h-3.5 text-emerald-700" />
                                {st.school || '未填寫學校'}
                              </span>
                            </div>

                            {/* 緊急聯絡人姓名與電話整合顯示 */}
                            <div className="text-xs text-stone-600 mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 bg-rose-50/80 text-rose-900 border border-rose-200/80 px-2.5 py-0.5 rounded-lg font-semibold">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                緊急聯絡人：{st.emergencyContactName || st.parentName}
                                {st.emergencyContactRelation ? `（${st.emergencyContactRelation}）` : ''}
                              </span>
                              {st.emergencyContactPhone && (
                                <a
                                  href={`tel:${st.emergencyContactPhone}`}
                                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold transition"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{st.emergencyContactPhone}</span>
                                </a>
                              )}
                              <span className="text-emerald-700 font-semibold ml-1">
                                累計出席：{presentCount} 堂
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenProfileModal(st, 'edit')}
                          className="bg-emerald-50 hover:bg-emerald-100 text-[#1B4332] font-bold text-xs px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1 shrink-0 active:scale-95 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>編輯檔案/成績</span>
                        </button>
                      </div>

                      {/* 修讀科目成績表現與目前學習進度區塊 */}
                      <div
                        onClick={() => handleOpenProfileModal(st, 'edit')}
                        className="bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/70 rounded-xl p-3 cursor-pointer transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#1B4332] flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                              修讀科目與成績表現：
                            </span>
                            {(st.subjects || []).map((subj) => {
                              const gradeObj = st.subjectGrades?.[subj] || { level: 'good', score: '' };
                              const lvl = PERFORMANCE_LEVELS[gradeObj.level] || PERFORMANCE_LEVELS.good;
                              return (
                                <span
                                  key={subj}
                                  className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border flex items-center gap-1 ${lvl.badgeClass}`}
                                >
                                  <span>{lvl.dot}</span>
                                  <span>{subj}</span>
                                  <span className="opacity-80">({lvl.label})</span>
                                  {gradeObj.score && (
                                    <span className="underline decoration-dotted ml-0.5">
                                      {gradeObj.score}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                          <span className="text-[11px] text-stone-400">
                            進度更新：{st.progressUpdatedAt || '—'}
                          </span>
                        </div>

                        {weakSubjects.length > 0 && (
                          <div className="bg-rose-50/90 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs text-rose-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="font-bold">重點加強提示：</span>
                            <span>
                              {weakSubjects
                                .map(
                                  (w) =>
                                    `${w.subject}（${PERFORMANCE_LEVELS[w.level]?.label}${
                                      w.score ? ` - ${w.score}` : ''
                                    }）`
                                )
                                .join('、')}
                            </span>
                          </div>
                        )}

                        <div className="text-xs text-stone-800 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                          <span className="font-bold text-emerald-950">現在學到哪裡：</span>
                          {st.currentProgress || '尚未填寫最新學習進度'}
                        </div>
                      </div>

                      {/* 歷堂負責導師與分科溫習紀錄長期資料庫 */}
                      {(Array.isArray(st.reviewLogs) && st.reviewLogs.length > 0) || sessionTutorEntries.length > 0 ? (
                        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 space-y-2">
                          <div className="text-xs font-bold text-[#1B4332] flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-emerald-700" />
                              <span>長期課堂分科溫習紀錄庫：</span>
                            </span>
                            <span className="text-[11px] text-stone-400 font-normal">
                              共 {(st.reviewLogs || []).length || sessionTutorEntries.length} 堂紀錄
                            </span>
                          </div>

                          <div className="space-y-2">
                            {((st.reviewLogs && st.reviewLogs.length > 0)
                              ? st.reviewLogs
                              : sessionTutorEntries.map(([sId, sData]) => {
                                  const sessObj = sessions.find((s) => s.id === sId);
                                  return {
                                    id: sId,
                                    sessionId: sId,
                                    sessionLabel: sessObj ? sessObj.label : sId,
                                    tutors: sData.tutors || [],
                                    reviewedSubjects: sData.reviewedSubjects || [],
                                    subjectNotes: sData.subjectNotes || {},
                                    note: sData.note || '',
                                    updatedAt: sData.updatedAt || ''
                                  };
                                })
                            ).map((logItem) => (
                              <div
                                key={logItem.id || logItem.sessionId}
                                className="bg-white border border-stone-200/90 rounded-lg p-2.5 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-[#1B4332] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      {logItem.sessionLabel}
                                    </span>
                                    {logItem.tutors?.length > 0 && (
                                      <span className="bg-emerald-700 text-white px-2 py-0.5 rounded font-bold text-[11px]">
                                        導師：{logItem.tutors.join('、')}
                                      </span>
                                    )}
                                  </div>
                                  {logItem.updatedAt && (
                                    <span className="text-[10px] text-stone-400 font-mono">
                                      {logItem.updatedAt}
                                    </span>
                                  )}
                                </div>

                                {/* 顯示該堂各科目的獨立溫習備註 */}
                                {Array.isArray(logItem.reviewedSubjects) &&
                                logItem.reviewedSubjects.length > 0 ? (
                                  <div className="space-y-1 pt-0.5">
                                    {logItem.reviewedSubjects.map((subj) => (
                                      <div
                                        key={subj}
                                        className="text-xs text-stone-700 flex items-start gap-1.5 pl-1"
                                      >
                                        <span className="font-bold text-emerald-800 shrink-0">
                                          • [{subj}]：
                                        </span>
                                        <span className="text-stone-800">
                                          {logItem.subjectNotes?.[subj] || '已完成今日溫習'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  logItem.note && (
                                    <div className="text-xs text-stone-700 pl-1">{logItem.note}</div>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* 最新備註與歷史紀錄觸發區 */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => handleOpenRemarksModal(st)}
                          className="flex-1 text-left flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-amber-50/70 transition group"
                        >
                          <div className="min-w-0 flex-1 text-xs">
                            <span className="font-bold text-stone-700">最新備註：</span>
                            <span className="text-stone-800 font-medium">{latestRemarkObj.text}</span>
                            <span className="block text-[11px] text-stone-400 mt-0.5">
                              添加日期：{latestRemarkObj.date || '2026-09-19'}
                            </span>
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-1 bg-amber-100 group-hover:bg-amber-200 text-amber-900 font-bold px-2.5 py-1.5 rounded-lg text-xs transition">
                            <History className="w-3.5 h-3.5 text-amber-700" />
                            <span>翻查舊備註 ({historyList.length})</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}
      </main>

      {/* 底部固定手機導航列 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg z-40">
        <div className="max-w-2xl mx-auto px-3 py-2 grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition ${
              activeTab === 'daily'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>單日快速點名</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition ${
              activeTab === 'matrix'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>點名總表 ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition ${
              activeTab === 'database'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>學生資料庫</span>
          </button>
        </div>
      </nav>

      {/* ==================== 彈出視窗 1：學生詳細資料、緊急聯絡人與科目成績表現 (Student Profile & Progress Modal) ==================== */}
      {profileModal.open && profileModal.data && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#1B4332] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-stone-900">
                    {profileModal.mode === 'add' ? '新增學生檔案與學習進度' : `${profileModal.data.name} — 學生學習檔案`}
                  </h3>
                  <p className="text-xs text-stone-500">
                    整合保存緊急聯絡人、各科成績表現及學習進度
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProfileModal({ open: false, mode: 'view', data: null, customSubject: '' })}
                className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileModal} className="space-y-4">
              {/* 1. 學生姓名、就讀學校與年級 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    學生姓名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileModal.data.name}
                    onChange={(e) =>
                      setProfileModal({
                        ...profileModal,
                        data: { ...profileModal.data, name: e.target.value }
                      })
                    }
                    placeholder="例如：羅梓釗"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    就讀學校
                  </label>
                  <input
                    type="text"
                    value={profileModal.data.school}
                    onChange={(e) =>
                      setProfileModal({
                        ...profileModal,
                        data: { ...profileModal.data, school: e.target.value }
                      })
                    }
                    placeholder="例如：聖公會主恩小學"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    就讀年級
                  </label>
                  <select
                    value={profileModal.data.grade}
                    onChange={(e) =>
                      setProfileModal({
                        ...profileModal,
                        data: { ...profileModal.data, grade: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. 緊急聯絡人姓名與電話專區（將原本聯絡電話整合歸類至此） */}
              <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>緊急聯絡人資料（整合家長及聯絡電話）</span>
                  </span>
                  {profileModal.data.emergencyContactPhone && (
                    <a
                      href={`tel:${profileModal.data.emergencyContactPhone}`}
                      className="text-[11px] font-bold bg-rose-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-rose-700 transition"
                    >
                      <Phone className="w-3 h-3" />
                      <span>一鍵撥打</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      緊急聯絡人姓名
                    </label>
                    <input
                      type="text"
                      value={profileModal.data.emergencyContactName ?? profileModal.data.parentName ?? ''}
                      onChange={(e) =>
                        setProfileModal({
                          ...profileModal,
                          data: {
                            ...profileModal.data,
                            emergencyContactName: e.target.value,
                            parentName: e.target.value
                          }
                        })
                      }
                      placeholder="例如：吳玉婷"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      關係
                    </label>
                    <select
                      value={profileModal.data.emergencyContactRelation || '家長'}
                      onChange={(e) =>
                        setProfileModal({
                          ...profileModal,
                          data: {
                            ...profileModal.data,
                            emergencyContactRelation: e.target.value
                          }
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {RELATION_OPTIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      緊急聯絡電話
                    </label>
                    <input
                      type="text"
                      value={profileModal.data.emergencyContactPhone ?? profileModal.data.phone ?? ''}
                      onChange={(e) =>
                        setProfileModal({
                          ...profileModal,
                          data: {
                            ...profileModal.data,
                            emergencyContactPhone: e.target.value,
                            phone: e.target.value
                          }
                        })
                      }
                      placeholder="例如：9123-4567"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* 3. 修讀科目動態選擇與各科成績表現設定 */}
              <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-3.5 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    修讀科目（若某科目所有學生皆取消選修，該選項將自動從系統消失）
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {modalAvailableSubjects.map((subj) => {
                      const active = (profileModal.data.subjects || []).includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => handleToggleSubjectInModal(subj)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            active
                              ? 'bg-[#2D6A4F] text-white border-[#1B4332] shadow-2xs'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {active ? `✓ ${subj}` : `+ ${subj}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profileModal.customSubject}
                      onChange={(e) =>
                        setProfileModal({ ...profileModal, customSubject: e.target.value })
                      }
                      placeholder="輸入新科目名稱（如：常識、閱讀理解、奧數）..."
                      className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="px-3.5 py-2 rounded-xl bg-emerald-100 text-[#1B4332] font-bold text-xs hover:bg-emerald-200 shrink-0"
                    >
                      + 新增科目
                    </button>
                  </div>
                </div>

                {/* 為已選修的每個科目掛上成績與表現評級 */}
                {(profileModal.data.subjects || []).length > 0 && (
                  <div className="pt-2 border-t border-stone-200 space-y-2">
                    <div className="text-xs font-bold text-[#1B4332] flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                      <span>各科成績與表現評級（標記「急需加強」或「需多留意」會於點名卡醒目提示）：</span>
                    </div>

                    <div className="space-y-2">
                      {(profileModal.data.subjects || []).map((subj) => {
                        const gradeObj = profileModal.data.subjectGrades?.[subj] || {
                          level: 'good',
                          score: ''
                        };
                        return (
                          <div
                            key={subj}
                            className="bg-white border border-stone-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-stone-900 min-w-[48px]">
                                {subj}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {Object.values(PERFORMANCE_LEVELS).map((lvl) => {
                                  const isSelected = gradeObj.level === lvl.key;
                                  return (
                                    <button
                                      key={lvl.key}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSubjectGradeInModal(subj, 'level', lvl.key)
                                      }
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition ${
                                        isSelected
                                          ? `${lvl.badgeClass} ring-2 ring-offset-1 ring-stone-400`
                                          : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                                      }`}
                                    >
                                      {lvl.dot} {lvl.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <input
                              type="text"
                              value={gradeObj.score || ''}
                              onChange={(e) =>
                                handleUpdateSubjectGradeInModal(subj, 'score', e.target.value)
                              }
                              placeholder="輸入分數或弱項（如：58分 / 通分弱）"
                              className="sm:w-44 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. 現在學到哪裡了（當前學習進度） */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#1B4332]">
                    現在學到哪裡了？（當前學習進度紀錄）
                  </label>
                  {profileModal.mode !== 'add' && (
                    <span className="text-[11px] text-stone-400">
                      上次更新：{profileModal.data.progressUpdatedAt || '—'}
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={profileModal.data.currentProgress}
                  onChange={(e) =>
                    setProfileModal({
                      ...profileModal,
                      data: { ...profileModal.data, currentProgress: e.target.value }
                    })
                  }
                  placeholder="詳細記錄學生各科目前學到哪個單元、練習頁數或需要跟進的地方..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
                />
              </div>

              {/* 若為新增學生，可一併填寫初始備註 */}
              {profileModal.mode === 'add' && (
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    初始備註（回條／特別事項）
                  </label>
                  <input
                    type="text"
                    value={profileModal.data.remarks}
                    onChange={(e) =>
                      setProfileModal({
                        ...profileModal,
                        data: { ...profileModal.data, remarks: e.target.value }
                      })
                    }
                    placeholder="例如：已交回條（簽署日期：2026-09-19）"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              {/* 若為編輯現有學生，提供快速開啟備註歷史按鈕 */}
              {profileModal.mode !== 'add' && (
                <div className="pt-1 flex items-center justify-between bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                  <div className="text-xs">
                    <span className="font-bold text-amber-950">學生備註歷史紀錄：</span>
                    <span className="text-amber-800 ml-1">
                      共 {(profileModal.data.remarksHistory || []).length} 條紀錄
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const st = profileModal.data;
                      setProfileModal({ open: false, mode: 'view', data: null, customSubject: '' });
                      handleOpenRemarksModal(st);
                    }}
                    className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>查看 / 新增備註</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setProfileModal({ open: false, mode: 'view', data: null, customSubject: '' })}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white font-bold text-sm hover:bg-[#1B4332] shadow-sm"
                >
                  儲存至資料庫
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 彈出視窗 2：備註歷史時間軸 (Remarks History Modal) ==================== */}
      {remarksModal.open && activeRemarksStudent && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* 標題列 */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <History className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {activeRemarksStudent.name} — 備註歷史紀錄
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {activeRemarksStudent.school}（{activeRemarksStudent.grade}）｜最上方為當前最新備註
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setRemarksModal({
                    open: false,
                    studentId: null,
                    newText: '',
                    newDate: '',
                    editingHistoryId: null,
                    editingText: '',
                    editingDate: ''
                  })
                }
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 新增備註表單區 */}
            <form
              onSubmit={handleAddRemarkEntry}
              className="p-4 bg-amber-50/60 border-b border-amber-200/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <MessageSquarePlus className="w-4 h-4 text-amber-700" />
                  <span>新增一筆最新備註</span>
                </label>
                <input
                  type="text"
                  value={remarksModal.newDate}
                  onChange={(e) => setRemarksModal({ ...remarksModal, newDate: e.target.value })}
                  className="text-[11px] font-mono bg-white border border-amber-300 rounded-lg px-2 py-1 text-stone-700 w-36 text-center"
                  title="可自訂或保留當前添加日期時間"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={remarksModal.newText}
                  onChange={(e) => setRemarksModal({ ...remarksModal, newText: e.target.value })}
                  placeholder="輸入課堂表現、功課進度、家長交代或回條事項..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-[#2D6A4F] hover:bg-[#1B4332] active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shrink-0 shadow-xs transition"
                >
                  + 添加備註
                </button>
              </div>
            </form>

            {/* 歷次備註時間軸列表 */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                <span>歷史時間軸（共 {(activeRemarksStudent.remarksHistory || []).length} 筆紀錄）</span>
                <span>添加日期與時間</span>
              </div>

              {(activeRemarksStudent.remarksHistory || []).length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">
                  目前尚無任何備註紀錄，請從上方新增。
                </div>
              ) : (
                <div className="relative pl-4 border-l-2 border-emerald-300 space-y-3">
                  {(activeRemarksStudent.remarksHistory || []).map((item, idx) => {
                    const isLatest = idx === 0;
                    const isEditing = remarksModal.editingHistoryId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`relative rounded-2xl p-3.5 border transition ${
                          isLatest
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                            : 'bg-stone-50 border-stone-200/90'
                        }`}
                      >
                        {/* 時間軸圓點 */}
                        <span
                          className={`absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            isLatest ? 'bg-emerald-600 ring-2 ring-emerald-200' : 'bg-stone-400'
                          }`}
                        />

                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={remarksModal.editingDate}
                              onChange={(e) =>
                                setRemarksModal({ ...remarksModal, editingDate: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                              placeholder="添加日期 (YYYY-MM-DD HH:mm)"
                            />
                            <textarea
                              rows={2}
                              value={remarksModal.editingText}
                              onChange={(e) =>
                                setRemarksModal({ ...remarksModal, editingText: e.target.value })
                              }
                              className="w-full px-3 py-2 text-sm bg-white border border-emerald-400 rounded-xl focus:outline-none"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setRemarksModal({ ...remarksModal, editingHistoryId: null })
                                }
                                className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-700 text-xs font-semibold"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedRemarkEntry(item.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                              >
                                儲存修改
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5">
                                {isLatest ? (
                                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    當前最新備註
                                  </span>
                                ) : (
                                  <span className="bg-stone-200 text-stone-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    歷史備註
                                  </span>
                                )}
                                <span className="text-xs font-mono text-stone-500 font-medium">
                                  {item.date}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRemarksModal({
                                      ...remarksModal,
                                      editingHistoryId: item.id,
                                      editingText: item.text,
                                      editingDate: item.date
                                    })
                                  }
                                  className="p-1 text-stone-400 hover:text-emerald-700 rounded"
                                  title="編輯此備註"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {(activeRemarksStudent.remarksHistory || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRemarkEntry(item.id)}
                                    className="p-1 text-stone-400 hover:text-rose-600 rounded"
                                    title="刪除此備註"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-stone-800 font-medium leading-relaxed">
                              {item.text}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setRemarksModal({
                    open: false,
                    studentId: null,
                    newText: '',
                    newDate: '',
                    editingHistoryId: null,
                    editingText: '',
                    editingDate: ''
                  })
                }
                className="px-5 py-2 rounded-xl bg-stone-800 text-white font-bold text-xs sm:text-sm hover:bg-stone-900"
              >
                完成並關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 彈出視窗 3：修改課堂日期 ==================== */}
      {sessionModal.open && sessionModal.session && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-[#2D6A4F]" />
                <span>設定課堂日期</span>
              </h3>
              <button
                onClick={() => setSessionModal({ open: false, session: null, newLabel: '' })}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSessionModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  課堂日期顯示名稱
                </label>
                <input
                  type="text"
                  value={sessionModal.newLabel}
                  onChange={(e) => setSessionModal({ ...sessionModal, newLabel: e.target.value })}
                  placeholder="例如：1月9日 或 補堂(一)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSessionModal({ open: false, session: null, newLabel: '' })}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white font-bold text-sm hover:bg-[#1B4332]"
                >
                  儲存日期
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 彈出視窗 4：新增與管理溫習導師名字 ==================== */}
      {tutorModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#2D6A4F]" />
                <span>管理及新增溫習導師</span>
              </h3>
              <button
                onClick={() => setTutorModal({ open: false, studentId: null, newTutorName: '' })}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 現有導師名單（支援直接點擊 × 刪除） */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-stone-600">
                現有導師名單（點擊 × 可移除導師）：
              </div>
              <div className="flex flex-wrap gap-1.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                {tutors.map((tName) => (
                  <span
                    key={tName}
                    className="inline-flex items-center gap-1 bg-white border border-stone-200 text-stone-700 px-2.5 py-1 rounded-lg text-xs font-bold"
                  >
                    <span>{tName}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTutor(tName)}
                      className="text-stone-400 hover:text-rose-600 p-0.5"
                      title={`移除導師 ${tName}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => handleAddNewTutor(e, tutorModal.studentId)}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  新增導師名字 / 稱呼
                </label>
                <input
                  type="text"
                  value={tutorModal.newTutorName}
                  onChange={(e) =>
                    setTutorModal({ ...tutorModal, newTutorName: e.target.value })
                  }
                  placeholder="例如：Miss Chan、阿明..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTutorModal({ open: false, studentId: null, newTutorName: '' })}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm"
                >
                  關閉
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white font-bold text-sm hover:bg-[#1B4332]"
                >
                  + 確認新增導師
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 彈出視窗：確認對話框 ==================== */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900">{confirmModal.title}</h3>
            <p className="text-sm text-stone-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  setConfirmModal({ open: false, title: '', message: '', onConfirm: null })
                }
                className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700"
              >
                確定執行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}