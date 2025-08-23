import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle, Activity, Users, Eye, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface RoleAuditLog {
  id: string;
  user_id: string;
  changed_by: string;
  old_role: string;
  new_role: string;
  changed_at: string;
  reason?: string;
}

interface EnrollmentAttempt {
  id: string;
  user_id: string;
  course_id: string;
  attempted_at: string;
  ip_address?: unknown;
  success: boolean;
}

export default function SecurityDashboard() {
  const [roleAuditLogs, setRoleAuditLogs] = useState<RoleAuditLog[]>([]);
  const [enrollmentAttempts, setEnrollmentAttempts] = useState<EnrollmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Fetch role audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('role_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (auditError) {
        console.error('Error fetching audit logs:', auditError);
      } else {
        setRoleAuditLogs(auditData || []);
      }

      // Fetch enrollment attempts
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollment_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(100);

      if (enrollmentError) {
        console.error('Error fetching enrollment attempts:', enrollmentError);
      } else {
        setEnrollmentAttempts(enrollmentData || []);
      }

    } catch (error) {
      console.error('Security dashboard error:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSecurityStats = () => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentRoleChanges = roleAuditLogs.filter(
      log => new Date(log.changed_at) > last24Hours
    ).length;

    const recentFailedAttempts = enrollmentAttempts.filter(
      attempt => new Date(attempt.attempted_at) > last24Hours && !attempt.success
    ).length;

    const recentSuccessfulEnrollments = enrollmentAttempts.filter(
      attempt => new Date(attempt.attempted_at) > last24Hours && attempt.success
    ).length;

    return {
      recentRoleChanges,
      recentFailedAttempts,
      recentSuccessfulEnrollments,
      totalAuditLogs: roleAuditLogs.length,
    };
  };

  const stats = getSecurityStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
        </div>
        <Button onClick={fetchSecurityData} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Alerts */}
      {stats.recentFailedAttempts > 10 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Failed Enrollment Attempts</AlertTitle>
          <AlertDescription>
            Detected {stats.recentFailedAttempts} failed enrollment attempts in the last 24 hours. 
            This may indicate potential security issues.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Changes (24h)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentRoleChanges}</div>
            <p className="text-xs text-muted-foreground">
              User role modifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.recentFailedAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Blocked enrollment attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Enrollments (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.recentSuccessfulEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              Legitimate enrollments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audit Logs</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAuditLogs}</div>
            <p className="text-xs text-muted-foreground">
              Security events tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Details */}
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Role Audit Log</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Role Change Audit Log</span>
              </CardTitle>
              <CardDescription>
                Track all user role modifications for security monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roleAuditLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No role changes recorded</p>
              ) : (
                <div className="space-y-4">
                  {roleAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">User: {log.user_id}</span>
                          {log.old_role && (
                            <>
                              <Badge variant="outline">{log.old_role}</Badge>
                              <span>→</span>
                            </>
                          )}
                          <Badge variant="secondary">{log.new_role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Changed by: {log.changed_by || 'System'}
                        </p>
                        {log.reason && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {log.reason}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.changed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Enrollment Attempt Monitoring</span>
              </CardTitle>
              <CardDescription>
                Monitor course enrollment attempts for rate limiting and security
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentAttempts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No enrollment attempts recorded</p>
              ) : (
                <div className="space-y-4">
                  {enrollmentAttempts.slice(0, 20).map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">User: {attempt.user_id}</span>
                          <span className="text-sm text-muted-foreground">Course: {attempt.course_id}</span>
                          <Badge variant={attempt.success ? "default" : "destructive"}>
                            {attempt.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                        {attempt.ip_address && (
                          <p className="text-sm text-muted-foreground">
                            IP: {String(attempt.ip_address)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(attempt.attempted_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}