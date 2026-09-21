import { createRedisState } from '@chat-adapter/state-redis'
import { listAnswers } from '@/bot/x/answers'
import { required } from './env'

required('REDIS_URL')
const limit = Number(process.argv[2] ?? 20)

const state = createRedisState()
await state.connect()
for (const record of await listAnswers(state, limit)) console.log(JSON.stringify(record))
await state.disconnect()
