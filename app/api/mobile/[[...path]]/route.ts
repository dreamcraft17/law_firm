import { handleMobile } from '@/lib/api/mobile-handler';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleMobile(pathSegments, 'GET', request);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleMobile(pathSegments, 'POST', request);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleMobile(pathSegments, 'PUT', request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleMobile(pathSegments, 'PATCH', request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleMobile(pathSegments, 'DELETE', request);
}
