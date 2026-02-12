import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileHome() {
  const router = useRouter();
  const { user, logout } = useAuth(); 

  
  const functionCards = [
    {
      id: 'favorites',
      title: 'My Favorites',
      description: 'View and manage your saved climbing routes',
      icon: 'star' as const,
      route: '/profile/favorites',
      color: '#FFD700',
    },
    {
      id: 'climbing-log',
      title: 'Climbing Log',
      description: 'Record and review your climbing experiences',
      icon: 'book' as const,
      route: '/profile/climbing-log',
      color: '#4CAF50',
    },
  ];

  
  const handleCardPress = (route: string) => {
    if (!user) {
      
      alert('Please sign in to access this feature');
      return;
    }
    router.push(route as any);
  };

  
  const handleLogout = async () => {
    try {
      await logout();
      
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  
  const handleSignIn = () => {
    router.push('/auth/login' as any);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 用户信息区域 - 显示真实用户信息 */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <Ionicons 
            name={user ? "person-circle" : "person-circle-outline"} 
            size={80} 
            color={user ? "#007AFF" : "#CCCCCC"} 
          />
        </View>
        
        {user ? (
          <>
            <Text style={styles.userName}>
              {user.email?.split('@')[0] || 'Climber'}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userBio}>Ready for your next climb!</Text>
            
            {/* 退出按钮 */}
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.userName}>Welcome Climber!</Text>
            <Text style={styles.userBio}>Sign in to access all features</Text>
            
            {/* 登录/注册按钮 */}
            <TouchableOpacity 
              style={styles.signInButton} 
              onPress={handleSignIn}
            >
              <Ionicons name="log-in-outline" size={18} color="#007AFF" />
              <Text style={styles.signInText}>Sign In / Sign Up</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 功能卡片区域 - 根据登录状态调整 */}
      <View style={styles.cardsSection}>
        <Text style={styles.sectionTitle}>My Features</Text>
        
        {functionCards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.card,
              !user && styles.cardDisabled  
            ]}
            onPress={() => handleCardPress(card.route)}
            activeOpacity={user ? 0.7 : 1}
            disabled={!user} 
          >
            <View style={[styles.cardIconContainer, { 
              backgroundColor: `${card.color}${user ? '20' : '10'}` 
            }]}>
              <Ionicons 
                name={card.icon} 
                size={28} 
                color={user ? card.color : '#CCCCCC'} 
              />
            </View>
            
            <View style={styles.cardContent}>
              <Text style={[
                styles.cardTitle,
                !user && styles.textDisabled  
              ]}>
                {card.title}
              </Text>
              <Text style={[
                styles.cardDescription,
                !user && styles.textDisabled
              ]}>
                {user ? card.description : 'Sign in to access this feature'}
              </Text>
            </View>
            
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={user ? "#CCCCCC" : "#EEEEEE"} 
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* 统计信息 - 根据登录状态显示 */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Climbing Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user ? '0' : '--'}
            </Text>
            <Text style={styles.statLabel}>Favorite Routes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user ? '0' : '--'}
            </Text>
            <Text style={styles.statLabel}>Climbing Logs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user ? '0' : '--'}
            </Text>
            <Text style={styles.statLabel}>Climbing Spots</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user ? '0' : '--'}
            </Text>
            <Text style={styles.statLabel}>Climbing Days</Text>
          </View>
        </View>
        
        {/* 提示信息 */}
        {!user && (
          <View style={styles.signinHint}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.signinText}>
              Sign in to track your climbing statistics
            </Text>
          </View>
        )}
      </View>

      {/* 关于信息 */}
      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>About Climbing Map</Text>
        <View style={styles.aboutContent}>
          <Ionicons name="rocket-outline" size={24} color="#666" style={styles.aboutIcon} />
          <Text style={styles.aboutText}>
            This is a graduation project app for tracking climbing spots and routes.
            {!user && ' Sign in to experience the full features!'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
    marginBottom: 16,
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  userBio: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 20,
    marginTop: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    marginTop: 8,
  },
  signInText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  cardsSection: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  textDisabled: {
    color: '#999',
  },
  statsSection: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  signinHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  signinText: {
    marginLeft: 8,
    color: '#1976D2',
    fontSize: 14,
  },
  
  aboutSection: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  aboutContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aboutIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  aboutText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});