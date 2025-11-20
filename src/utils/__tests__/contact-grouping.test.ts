/**
 * 联系人分组工具函数测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { Contact } from '@/types/contact'
import { ContactType } from '@/types/contact'
import {
  ensureContactIndex,
  batchEnsureContactIndexes,
  groupAndSortContacts,
  generateIndexList,
  flattenGroups,
  searchContacts,
  toggleContactStar,
  getGroupStats
} from '../contact-grouping'

describe('contact-grouping utils', () => {
  // 测试数据
  const createContact = (
    nickname: string,
    remark: string = '',
    isStarred: boolean = false,
    starredAt?: number
  ): Contact => ({
    wxid: `wx_${nickname}`,
    nickname,
    remark,
    alias: '',
    avatar: '',
    type: ContactType.Friend,
    isStarred,
    starredAt
  })

  describe('ensureContactIndex', () => {
    it('应该计算联系人索引信息', () => {
      const contact = createContact('张三')
      ensureContactIndex(contact)
      
      expect(contact.pinyinInitial).toBe('Z')
      expect(contact.sortKey).toBeDefined()
    })

    it('应该优先使用备注计算索引', () => {
      const contact = createContact('张三', '阿明')
      ensureContactIndex(contact)
      
      expect(contact.pinyinInitial).toBe('A')
    })

    it('应该处理星标联系人', () => {
      const contact = createContact('张三', '', true)
      ensureContactIndex(contact)
      
      expect(contact.pinyinInitial).toBe('⭐')
    })

    it('不应该重复计算已有索引', () => {
      const contact = createContact('张三')
      contact.pinyinInitial = 'X'
      contact.sortKey = 'test'
      
      ensureContactIndex(contact)
      
      expect(contact.pinyinInitial).toBe('X')
      expect(contact.sortKey).toBe('test')
    })
  })

  describe('batchEnsureContactIndexes', () => {
    it('应该批量计算索引', () => {
      const contacts = [
        createContact('张三'),
        createContact('李四'),
        createContact('Tom')
      ]

      batchEnsureContactIndexes(contacts)

      expect(contacts[0].pinyinInitial).toBe('Z')
      expect(contacts[1].pinyinInitial).toBe('L')
      expect(contacts[2].pinyinInitial).toBe('T')
    })
  })

  describe('groupAndSortContacts', () => {
    it('应该正确分组联系人', () => {
      const contacts = [
        createContact('张三'),
        createContact('李四'),
        createContact('阿明'),
        createContact('Tom'),
        createContact('123客服')
      ]

      const groups = groupAndSortContacts(contacts)

      expect(groups.length).toBeGreaterThan(0)
      expect(groups.some(g => g.key === 'A')).toBe(true)
      expect(groups.some(g => g.key === 'L')).toBe(true)
      expect(groups.some(g => g.key === 'T')).toBe(true)
      expect(groups.some(g => g.key === 'Z')).toBe(true)
      expect(groups.some(g => g.key === '#')).toBe(true)
    })

    it('应该将星标联系人放在第一组', () => {
      const contacts = [
        createContact('张三'),
        createContact('李四', '', true, Date.now()),
        createContact('王五', '', true, Date.now() - 1000)
      ]

      const groups = groupAndSortContacts(contacts)

      expect(groups[0].type).toBe('starred')
      expect(groups[0].key).toBe('⭐')
      expect(groups[0].label).toBe('星标朋友')
      expect(groups[0].contacts.length).toBe(2)
    })

    it('应该按时间倒序排列星标联系人', () => {
      const now = Date.now()
      const contacts = [
        createContact('张三', '', true, now - 2000),
        createContact('李四', '', true, now),
        createContact('王五', '', true, now - 1000)
      ]

      const groups = groupAndSortContacts(contacts)
      const starredGroup = groups.find(g => g.key === '⭐')

      expect(starredGroup).toBeDefined()
      expect(starredGroup!.contacts[0].nickname).toBe('李四')
      expect(starredGroup!.contacts[1].nickname).toBe('王五')
      expect(starredGroup!.contacts[2].nickname).toBe('张三')
    })

    it('应该按拼音排序同组联系人', () => {
      const contacts = [
        createContact('张三'),
        createContact('张一'),
        createContact('张二')
      ]

      const groups = groupAndSortContacts(contacts)
      const zGroup = groups.find(g => g.key === 'Z')

      expect(zGroup).toBeDefined()
      expect(zGroup!.contacts.length).toBe(3)
    })

    it('应该正确设置分组排序顺序', () => {
      const contacts = [
        createContact('张三', '', true),
        createContact('阿明'),
        createContact('123')
      ]

      const groups = groupAndSortContacts(contacts)

      expect(groups[0].sortOrder).toBe(0) // 星标
      expect(groups.find(g => g.key === 'A')?.sortOrder).toBe(1)
      expect(groups.find(g => g.key === '#')?.sortOrder).toBe(27)
    })

    it('应该正确统计每组人数', () => {
      const contacts = [
        createContact('张三'),
        createContact('张四'),
        createContact('李五'),
        createContact('Tom')
      ]

      const groups = groupAndSortContacts(contacts)

      expect(groups.find(g => g.key === 'Z')?.count).toBe(2)
      expect(groups.find(g => g.key === 'L')?.count).toBe(1)
      expect(groups.find(g => g.key === 'T')?.count).toBe(1)
    })
  })

  describe('generateIndexList', () => {
    it('应该生成完整的索引列表', () => {
      const contacts = [
        createContact('张三', '', true),
        createContact('阿明'),
        createContact('Bob'),
        createContact('123')
      ]

      const groups = groupAndSortContacts(contacts)
      const indexList = generateIndexList(groups)

      expect(indexList).toHaveLength(28) // ⭐ + 26字母 + #
      expect(indexList[0].key).toBe('⭐')
      expect(indexList[0].enabled).toBe(true)
      expect(indexList[1].key).toBe('A')
      expect(indexList[1].enabled).toBe(true)
      expect(indexList[27].key).toBe('#')
      expect(indexList[27].enabled).toBe(true)
    })

    it('应该标记没有数据的索引为禁用', () => {
      const contacts = [
        createContact('张三')
      ]

      const groups = groupAndSortContacts(contacts)
      const indexList = generateIndexList(groups)

      const aIndex = indexList.find(i => i.key === 'A')
      const zIndex = indexList.find(i => i.key === 'Z')

      expect(aIndex?.enabled).toBe(false)
      expect(zIndex?.enabled).toBe(true)
    })

    it('应该设置正确的索引类型', () => {
      const contacts = [
        createContact('张三', '', true),
        createContact('阿明'),
        createContact('123')
      ]

      const groups = groupAndSortContacts(contacts)
      const indexList = generateIndexList(groups)

      expect(indexList.find(i => i.key === '⭐')?.type).toBe('starred')
      expect(indexList.find(i => i.key === 'A')?.type).toBe('letter')
      expect(indexList.find(i => i.key === '#')?.type).toBe('special')
    })
  })

  describe('flattenGroups', () => {
    it('应该将分组扁平化', () => {
      const contacts = [
        createContact('张三'),
        createContact('李四')
      ]

      const groups = groupAndSortContacts(contacts)
      const flattened = flattenGroups(groups)

      expect(flattened.length).toBeGreaterThan(contacts.length)
      expect(flattened.some(item => item.type === 'header')).toBe(true)
      expect(flattened.some(item => item.type === 'item')).toBe(true)
    })

    it('应该为每个分组添加头部', () => {
      const contacts = [
        createContact('张三'),
        createContact('阿明')
      ]

      const groups = groupAndSortContacts(contacts)
      const flattened = flattenGroups(groups)

      const headers = flattened.filter(item => item.type === 'header')
      expect(headers.length).toBe(groups.length)
    })

    it('应该保持联系人数据完整', () => {
      const contacts = [
        createContact('张三'),
        createContact('李四')
      ]

      const groups = groupAndSortContacts(contacts)
      const flattened = flattenGroups(groups)

      const items = flattened.filter(item => item.type === 'item')
      expect(items.length).toBe(contacts.length)
      expect(items.every(item => item.data !== undefined)).toBe(true)
    })
  })

  describe('searchContacts', () => {
    const contacts = [
      createContact('张三', '小张'),
      createContact('李四', 'Tom'),
      createContact('王五'),
      createContact('Tom'),
      createContact('alice')
    ]

    beforeEach(() => {
      batchEnsureContactIndexes(contacts)
    })

    it('应该按昵称搜索', () => {
      const result = searchContacts(contacts, '张三')
      expect(result.length).toBe(1)
      expect(result[0].nickname).toBe('张三')
    })

    it('应该按备注搜索', () => {
      const result = searchContacts(contacts, '小张')
      expect(result.length).toBe(1)
      expect(result[0].nickname).toBe('张三')
    })

    it('应该支持拼音搜索', () => {
      const result = searchContacts(contacts, 'zhang')
      expect(result.some(c => c.nickname === '张三')).toBe(true)
    })

    it('应该支持大小写不敏感搜索', () => {
      const result1 = searchContacts(contacts, 'TOM')
      const result2 = searchContacts(contacts, 'tom')
      expect(result1.length).toBe(result2.length)
    })

    it('应该返回所有匹配结果', () => {
      const result = searchContacts(contacts, 'Tom')
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('空关键词应该返回全部联系人', () => {
      const result = searchContacts(contacts, '')
      expect(result.length).toBe(contacts.length)
    })

    it('无匹配结果应该返回空数组', () => {
      const result = searchContacts(contacts, 'xyz123notfound')
      expect(result.length).toBe(0)
    })
  })

  describe('toggleContactStar', () => {
    it('应该设置星标状态', () => {
      const contact = createContact('张三')
      toggleContactStar(contact, true)

      expect(contact.isStarred).toBe(true)
      expect(contact.starredAt).toBeDefined()
      expect(contact.pinyinInitial).toBe('⭐')
    })

    it('应该取消星标状态', () => {
      const contact = createContact('张三', '', true, Date.now())
      toggleContactStar(contact, false)

      expect(contact.isStarred).toBe(false)
      expect(contact.starredAt).toBeUndefined()
      expect(contact.pinyinInitial).toBe('Z')
    })

    it('应该更新索引字母', () => {
      const contact = createContact('张三')
      contact.pinyinInitial = 'Z'

      toggleContactStar(contact, true)
      expect(contact.pinyinInitial).toBe('⭐')

      toggleContactStar(contact, false)
      expect(contact.pinyinInitial).toBe('Z')
    })
  })

  describe('getGroupStats', () => {
    it('应该统计总人数', () => {
      const contacts = [
        createContact('张三'),
        createContact('李四'),
        createContact('王五')
      ]

      const groups = groupAndSortContacts(contacts)
      const stats = getGroupStats(groups)

      expect(stats.total).toBe(3)
    })

    it('应该统计星标人数', () => {
      const contacts = [
        createContact('张三', '', true),
        createContact('李四', '', true),
        createContact('王五')
      ]

      const groups = groupAndSortContacts(contacts)
      const stats = getGroupStats(groups)

      expect(stats.starred).toBe(2)
    })

    it('应该统计字母分组人数', () => {
      const contacts = [
        createContact('张三'),
        createContact('李四'),
        createContact('123')
      ]

      const groups = groupAndSortContacts(contacts)
      const stats = getGroupStats(groups)

      expect(stats.letters).toBe(2)
      expect(stats.special).toBe(1)
    })

    it('空分组应该返回零', () => {
      const groups = groupAndSortContacts([])
      const stats = getGroupStats(groups)

      expect(stats.total).toBe(0)
      expect(stats.starred).toBe(0)
      expect(stats.letters).toBe(0)
      expect(stats.special).toBe(0)
    })
  })
})