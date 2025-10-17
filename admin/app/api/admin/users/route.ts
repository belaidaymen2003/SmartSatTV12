import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import * as bcrypt from "bcrypt"

const prisma = new PrismaClient()

interface CreateUserPayload {
  name: string
  email: string
  username: string
  credits?: number
  password?: string
}

interface UpdateUserPayload {
  name?: string
  email?: string
  username?: string
  credits?: number
}

interface CreditPayload {
  userId: number
  amount: number
}



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const search = searchParams.get('search')?.toLowerCase()
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 10)))

    if (id) {
      const userId = Number(id)
      if (!Number.isFinite(userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            credits: true,
            status: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                comments: true,
                reviews: true,
              },
            },
          },
        })

        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          credits: user.credits,
          status: user.status,
          comments: user._count.comments,
          reviews: user._count.reviews,
          createdAt: user.createdAt.toISOString().split('T')[0],
        })
      } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
      }
    }

    try {
      const where: any = {}
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ]
      }

      const  users = await prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            credits: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                comments: true,
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        })
        const total = await prisma.user.count()

      const formattedUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        plan: 'Premium',
        credits: user.credits,
        status: user.status === 'APPROVED' ? 'Approved' : 'Banned',
        comments: user._count.comments,
        reviews: user._count.reviews,
        createdAt: user.createdAt.toISOString().split('T')[0],
      }))

      return NextResponse.json({
        users: formattedUsers,
        total,
        page,
        pageSize,
      })
    } catch (dbError: any) {
      console.error('Database error:', dbError.message)
      return NextResponse.json({ 'Database error:': dbError.message }, { status: 500 })

    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, username, credits = 0, password } = body as CreateUserPayload

    if (!name || !email || !username) {
      return NextResponse.json(
        { error: 'Name, email, and username are required' },
        { status: 400 }
      )
    }

    const defaultPassword = password || 'TempPassword123!'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          username,
          passwordHash,
          credits: Math.max(0, credits),
          status: 'APPROVED',
          role: 'USER',
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          credits: true,
          status: true,
          createdAt: true,
        },
      })

      return NextResponse.json(
        {
          message: 'User created successfully',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            credits: user.credits,
            status: user.status === 'APPROVED' ? 'Approved' : 'Banned',
            createdAt: user.createdAt.toISOString().split('T')[0],
          },
        },
        { status: 201 }
      )
    } catch (error: any) {
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field'
        return NextResponse.json(
          { error: `This ${field} is already in use` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, username, credits, status, password } = body

    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    try {
      const updateData: any = {}
      if (name) updateData.name = name
      if (email) updateData.email = email
      if (username) updateData.username = username
      if (credits !== undefined) updateData.credits = Math.max(0, credits)
      if (status) updateData.status = status === 'Banned' ? 'BANNED' : 'APPROVED'
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10)
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          credits: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              comments: true,
              reviews: true,
            },
          },
        },
      })

      return NextResponse.json({
        message: 'User updated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          plan: 'Premium',
          credits: user.credits,
          status: user.status === 'APPROVED' ? 'Approved' : 'Banned',
          comments: user._count.comments,
          reviews: user._count.reviews,
          createdAt: user.createdAt.toISOString().split('T')[0],
        },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field'
        return NextResponse.json(
          { error: `This ${field} is already in use` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || !Number.isFinite(Number(id))) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    try {
      await prisma.user.delete({
        where: { id: Number(id) },
      })

      return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
