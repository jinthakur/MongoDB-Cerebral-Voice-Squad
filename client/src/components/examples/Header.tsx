import Header from '../Header'

export default function HeaderExample() {
  return (
    <Header
      onNewConversation={() => console.log('New conversation clicked')}
      onSettings={() => console.log('Settings clicked')}
    />
  )
}
