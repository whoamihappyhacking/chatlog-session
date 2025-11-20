/**
 * 拼音转换工具函数测试
 */

import { describe, it, expect } from 'vitest'
import {
  getContactIndexKey,
  getContactSortKey,
  compareContactNames,
  startsWithChinese,
  startsWithLetter,
  startsWithSpecial,
  getAllIndexKeys,
  batchCalculateIndexes
} from '../pinyin'

describe('pinyin utils', () => {
  describe('getContactIndexKey', () => {
    it('应该返回星标标识', () => {
      expect(getContactIndexKey('张三', true)).toBe('⭐')
      expect(getContactIndexKey('Tom', true)).toBe('⭐')
      expect(getContactIndexKey('123', true)).toBe('⭐')
    })

    it('应该正确处理中文姓名', () => {
      expect(getContactIndexKey('张三')).toBe('Z')
      expect(getContactIndexKey('李四')).toBe('L')
      expect(getContactIndexKey('王五')).toBe('W')
      expect(getContactIndexKey('赵六')).toBe('Z')
      expect(getContactIndexKey('孙七')).toBe('S')
      expect(getContactIndexKey('欧阳锋')).toBe('O')
      expect(getContactIndexKey('诸葛亮')).toBe('Z')
    })

    it('应该正确处理英文姓名', () => {
      expect(getContactIndexKey('Tom')).toBe('T')
      expect(getContactIndexKey('alice')).toBe('A')
      expect(getContactIndexKey('Bob')).toBe('B')
      expect(getContactIndexKey('Charlie')).toBe('C')
    })

    it('应该正确处理数字开头', () => {
      expect(getContactIndexKey('123')).toBe('#')
      expect(getContactIndexKey('456客服')).toBe('#')
      expect(getContactIndexKey('789号')).toBe('#')
    })

    it('应该正确处理特殊符号', () => {
      expect(getContactIndexKey('@Admin')).toBe('#')
      expect(getContactIndexKey('***')).toBe('#')
      expect(getContactIndexKey('...')).toBe('#')
      expect(getContactIndexKey('【管理员】')).toBe('#')
    })

    it('应该正确处理空字符串', () => {
      expect(getContactIndexKey('')).toBe('#')
      expect(getContactIndexKey('   ')).toBe('#')
    })

    it('应该正确处理混合字符', () => {
      expect(getContactIndexKey('A张三')).toBe('A')
      expect(getContactIndexKey('张三Tom')).toBe('Z')
    })
  })

  describe('getContactSortKey', () => {
    it('应该正确转换中文拼音', () => {
      const key1 = getContactSortKey('张三')
      const key2 = getContactSortKey('李四')
      expect(key1).toMatch(/zhang/)
      expect(key2).toMatch(/li/)
    })

    it('应该正确处理英文', () => {
      expect(getContactSortKey('Tom')).toBe('tom')
      expect(getContactSortKey('ALICE')).toBe('alice')
    })

    it('应该正确处理空字符串', () => {
      expect(getContactSortKey('')).toBe('')
      expect(getContactSortKey('   ')).toBe('')
    })

    it('应该保持一致性', () => {
      const key1 = getContactSortKey('张三')
      const key2 = getContactSortKey('张三')
      expect(key1).toBe(key2)
    })
  })

  describe('compareContactNames', () => {
    it('应该正确比较中文姓名', () => {
      expect(compareContactNames('阿明', '张三')).toBeLessThan(0)
      expect(compareContactNames('张三', '阿明')).toBeGreaterThan(0)
      expect(compareContactNames('张三', '张三')).toBe(0)
    })

    it('应该正确比较英文姓名', () => {
      expect(compareContactNames('Alice', 'Bob')).toBeLessThan(0)
      expect(compareContactNames('Bob', 'Alice')).toBeGreaterThan(0)
      expect(compareContactNames('Tom', 'Tom')).toBe(0)
    })

    it('应该正确比较混合姓名', () => {
      expect(compareContactNames('阿明', 'Bob')).toBeLessThan(0)
      expect(compareContactNames('张三', 'Alice')).toBeGreaterThan(0)
    })
  })

  describe('startsWithChinese', () => {
    it('应该识别中文开头', () => {
      expect(startsWithChinese('张三')).toBe(true)
      expect(startsWithChinese('李四')).toBe(true)
    })

    it('应该识别非中文开头', () => {
      expect(startsWithChinese('Tom')).toBe(false)
      expect(startsWithChinese('123')).toBe(false)
      expect(startsWithChinese('@Admin')).toBe(false)
    })

    it('应该处理空字符串', () => {
      expect(startsWithChinese('')).toBe(false)
      expect(startsWithChinese('   ')).toBe(false)
    })
  })

  describe('startsWithLetter', () => {
    it('应该识别字母开头', () => {
      expect(startsWithLetter('Tom')).toBe(true)
      expect(startsWithLetter('alice')).toBe(true)
      expect(startsWithLetter('A')).toBe(true)
    })

    it('应该识别非字母开头', () => {
      expect(startsWithLetter('张三')).toBe(false)
      expect(startsWithLetter('123')).toBe(false)
      expect(startsWithLetter('@Admin')).toBe(false)
    })

    it('应该处理空字符串', () => {
      expect(startsWithLetter('')).toBe(false)
      expect(startsWithLetter('   ')).toBe(false)
    })
  })

  describe('startsWithSpecial', () => {
    it('应该识别特殊字符开头', () => {
      expect(startsWithSpecial('123')).toBe(true)
      expect(startsWithSpecial('@Admin')).toBe(true)
      expect(startsWithSpecial('***')).toBe(true)
    })

    it('应该识别非特殊字符开头', () => {
      expect(startsWithSpecial('Tom')).toBe(false)
      expect(startsWithSpecial('张三')).toBe(false)
    })

    it('应该处理空字符串', () => {
      expect(startsWithSpecial('')).toBe(true)
      expect(startsWithSpecial('   ')).toBe(true)
    })
  })

  describe('getAllIndexKeys', () => {
    it('应该返回正确的索引列表', () => {
      const keys = getAllIndexKeys()
      expect(keys).toHaveLength(28) // ⭐ + 26字母 + #
      expect(keys[0]).toBe('⭐')
      expect(keys[1]).toBe('A')
      expect(keys[26]).toBe('Z')
      expect(keys[27]).toBe('#')
    })
  })

  describe('batchCalculateIndexes', () => {
    it('应该批量计算索引信息', () => {
      const contacts = [
        { nickname: '张三', remark: '' },
        { nickname: 'Tom', remark: '' },
        { nickname: '123', remark: '' }
      ]

      const result = batchCalculateIndexes(contacts)

      expect(result[0].pinyinInitial).toBe('Z')
      expect(result[0].sortKey).toMatch(/zhang/)
      expect(result[1].pinyinInitial).toBe('T')
      expect(result[1].sortKey).toBe('tom')
      expect(result[2].pinyinInitial).toBe('#')
    })

    it('应该优先使用备注', () => {
      const contacts = [
        { nickname: '张三', remark: '阿明' }
      ]

      const result = batchCalculateIndexes(contacts)
      expect(result[0].pinyinInitial).toBe('A')
    })

    it('应该处理星标联系人', () => {
      const contacts = [
        { nickname: '张三', remark: '', isStarred: true },
        { nickname: 'Tom', remark: '', isStarred: false }
      ]

      const result = batchCalculateIndexes(contacts)
      expect(result[0].pinyinInitial).toBe('⭐')
      expect(result[1].pinyinInitial).toBe('T')
    })
  })
})