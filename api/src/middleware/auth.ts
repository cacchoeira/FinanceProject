import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: user.id,
      email: user.email!,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const businessId = req.params.businessId || req.body.business_id;
      
      if (!businessId) {
        return res.status(400).json({ error: 'Business ID required' });
      }

      // Check user role for this business
      const { data: userRole, error } = await supabase
        .from('user_business_roles')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('business_id', businessId)
        .single();

      if (error || !userRole) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!roles.includes(userRole.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.user.role = userRole.role;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}