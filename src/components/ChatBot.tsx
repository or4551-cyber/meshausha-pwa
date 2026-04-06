import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Send, ShoppingCart, History, Star, BarChart3, DollarSign, FileText, Sparkles } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useOrdersStore } from '../stores/ordersStore'
import { detectIntent, getIntentResponse, getSmartSuggestions } from '../lib/chatbotAI'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  text: string
  isBot: boolean
  options?: ChatOption[]
}

interface ChatOption {
  label: string
  icon?: any
  action: () => void
}

export default function ChatBot() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getOrdersByBranch } = useOrdersStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [showWelcome, setShowWelcome] = useState(false)
  const [userInput, setUserInput] = useState('')

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const userOrders = user ? getOrdersByBranch(user.branchCode) : []
      const suggestions = getSmartSuggestions(userOrders, new Date())
      
      let greeting = 'שלום! 👋 אני הבוט החכם של משאוושה.\n'
      
      if (suggestions.length > 0) {
        greeting += '\n' + suggestions.join('\n') + '\n\n'
      }
      
      greeting += 'איך אני יכול לעזור לך היום?'
      
      addBotMessage(greeting, getMainOptions())
    }
  }, [isOpen, user])

  const getMainOptions = (): ChatOption[] => {
    const options: ChatOption[] = [
      {
        label: '🛒 יצירת הזמנה חדשה',
        icon: ShoppingCart,
        action: () => {
          addBotMessage('מעולה! אני מעביר אותך לדף ההזמנות 📦')
          setTimeout(() => {
            navigate('/orders')
            setIsOpen(false)
          }, 1000)
        }
      },
      {
        label: '📜 צפייה בהיסטוריה',
        icon: History,
        action: () => {
          addBotMessage('אני מעביר אותך להיסטוריית ההזמנות 📋')
          setTimeout(() => {
            navigate('/history')
            setIsOpen(false)
          }, 1000)
        }
      },
      {
        label: '⭐ איך להשתמש במועדפים?',
        icon: Star,
        action: () => {
          addBotMessage(
            'כדי להשתמש במועדפים:\n\n1️⃣ בדף המוצרים, לחץ על הכוכב ליד המוצר\n2️⃣ המוצר יישמר במועדפים שלך\n3️⃣ לחץ על כפתור "מועדפים" כדי לראות רק מוצרים מועדפים\n\nזה חוסך זמן בהזמנות הבאות! ⚡',
            [{ label: '👍 הבנתי, תודה!', action: () => addBotMessage('בכיף! יש עוד משהו שאוכל לעזור בו?', getMainOptions()) }]
          )
        }
      },
      {
        label: '📝 איך לשמור תבנית?',
        action: () => {
          addBotMessage(
            'כדי לשמור תבנית הזמנה:\n\n1️⃣ צור הזמנה רגילה\n2️⃣ בדף הסיכום, לחץ על "שמור תבנית"\n3️⃣ תן שם לתבנית\n4️⃣ בפעם הבאה תוכל לטעון אותה מהר!\n\nמושלם להזמנות חוזרות 🔄',
            [{ label: '👍 הבנתי!', action: () => addBotMessage('נהדר! מה עוד?', getMainOptions()) }]
          )
        }
      }
    ]

    if (user?.isAdmin) {
      options.push(
        {
          label: '📊 דשבורד אדמין',
          icon: BarChart3,
          action: () => {
            addBotMessage('מעביר אותך לפאנל האדמין 🔐')
            setTimeout(() => {
              navigate('/admin')
              setIsOpen(false)
            }, 1000)
          }
        },
        {
          label: '💰 ניהול מחירים',
          icon: DollarSign,
          action: () => {
            addBotMessage('מעביר אותך לניהול מחירים 💵')
            setTimeout(() => {
              navigate('/admin/prices')
              setIsOpen(false)
            }, 1000)
          }
        },
        {
          label: '📈 דוחות כלכליים',
          icon: FileText,
          action: () => {
            addBotMessage('מעביר אותך לדוחות 📊')
            setTimeout(() => {
              navigate('/admin/reports')
              setIsOpen(false)
            }, 1000)
          }
        }
      )
    }

    return options
  }

  const addBotMessage = (text: string, options?: ChatOption[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isBot: true,
      options
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleOptionClick = (option: ChatOption) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: option.label,
      isBot: false
    }])
    option.action()
  }

  const handleUserMessage = (text: string) => {
    if (!text.trim()) return
    
    // הוספת הודעת המשתמש
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      isBot: false
    }])
    
    // זיהוי כוונה
    const intent = detectIntent(text)
    
    if (intent) {
      const { response, action } = getIntentResponse(intent.name)
      
      if (action.startsWith('navigate:')) {
        const path = action.replace('navigate:', '')
        addBotMessage(response)
        setTimeout(() => {
          navigate(path)
          setIsOpen(false)
        }, 1000)
      } else if (action === 'main_menu') {
        addBotMessage(response, getMainOptions())
      } else {
        addBotMessage(response, [
          { label: '👍 הבנתי!', action: () => addBotMessage('נהדר! מה עוד?', getMainOptions()) }
        ])
      }
    } else {
      addBotMessage(
        'לא בטוח שהבנתי... 🤔\nאבל אתה יכול לבחור מהאופציות למטה!',
        getMainOptions()
      )
    }
    
    setUserInput('')
  }

  const resetChat = () => {
    setMessages([])
    const userOrders = user ? getOrdersByBranch(user.branchCode) : []
    const suggestions = getSmartSuggestions(userOrders, new Date())
    
    let greeting = 'איך אני יכול לעזור לך?'
    if (suggestions.length > 0) {
      greeting = suggestions.join('\n') + '\n\n' + greeting
    }
    
    addBotMessage(greeting, getMainOptions())
  }

  return (
    <>
      <AnimatePresence>
        {showWelcome && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 left-4 sm:left-6 z-40"
          >
            <div className="bg-secondary rounded-2xl p-4 shadow-2xl max-w-[280px] relative">
              <button
                onClick={() => setShowWelcome(false)}
                className="absolute -top-2 -right-2 bg-primary/20 text-primary rounded-full p-1 hover:bg-primary/30 transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                  <MessageCircle className="text-primary" size={20} />
                </div>
                <div>
                  <p className="text-primary font-bold text-sm mb-1">שלום! 👋</p>
                  <p className="text-primary/70 text-xs leading-relaxed">
                    אני כאן לעזור לך לנווט באפליקציה. לחץ עליי לשיחה!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-4 sm:left-6 z-50 bg-gradient-to-br from-bot to-[#96a556] text-white p-4 rounded-full shadow-2xl hover:shadow-bot/50 transition-all touch-manipulation"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={28} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle size={28} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-4 sm:left-6 z-40 w-[calc(100vw-2rem)] sm:w-96 bg-secondary rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-bot to-[#96a556] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <MessageCircle className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">בוט משאוושה</h3>
                  <p className="text-white/80 text-xs">תמיד כאן לעזור 🤖</p>
                </div>
              </div>
              <button
                onClick={resetChat}
                className="text-white/80 hover:text-white transition-colors text-xs font-bold"
              >
                איפוס
              </button>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-3 bg-primary/5">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] ${message.isBot ? 'bg-white' : 'bg-bot text-white'} rounded-2xl p-3 shadow-md`}>
                    <p className={`text-sm whitespace-pre-line leading-relaxed ${message.isBot ? 'text-primary' : 'text-white'} font-bold`}>
                      {message.text}
                    </p>
                    
                    {message.options && message.options.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleOptionClick(option)}
                            className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 text-sm text-right flex items-center gap-2 touch-manipulation"
                          >
                            {option.icon && <option.icon size={16} />}
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-3 bg-white border-t border-primary/10">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="כתוב הודעה או בחר מהאופציות..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUserMessage(userInput)
                      }
                    }}
                    className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-2.5 px-4 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-bot/20"
                  />
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-bot/40" size={16} />
                </div>
                <button 
                  onClick={() => handleUserMessage(userInput)}
                  className="bg-bot text-white p-2.5 rounded-xl hover:bg-[#96a556] transition-colors touch-manipulation"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
