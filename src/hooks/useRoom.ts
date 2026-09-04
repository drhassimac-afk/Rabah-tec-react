import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { joinRoom } from '../api/socket';
import { useConnection } from '../api/ConnectionService';

export const NAME_KEY = 'rabahdj_rn_name';
export const ROOM_KEY = 'rabahdj_rn_room';

export function useRoom() {
  const { status } = useConnection();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('100');
  const joinedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const savedName = (await AsyncStorage.getItem(NAME_KEY)) || '';
      const savedRoom = (await AsyncStorage.getItem(ROOM_KEY)) || '100';
      setName(savedName);
      setRoom(savedRoom);
    })();
  }, []);

  useEffect(() => {
    if (status === 'connected' && name && room && !joinedRef.current) {
      joinRoom(room, name);
      joinedRef.current = true;
    }
    if (status !== 'connected') {
      joinedRef.current = false;
    }
  }, [status, name, room]);

  return { name, room, status };
}
