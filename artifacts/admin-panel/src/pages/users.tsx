import { useState } from "react";
import { useGetAdminUsers, getGetAdminUsersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useGetAdminUsers(
    { page, limit: 20, search },
    { query: { queryKey: getGetAdminUsersQueryKey({ page, limit: 20, search }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Users</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2 pt-4">
            <form onSubmit={handleSearch} className="flex w-full space-x-2">
              <Input 
                type="text" 
                placeholder="Search by phone, username..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data || data.users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No users found.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Phone / Username</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">{user.id.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <div className="font-medium">{user.phone}</div>
                          <div className="text-xs text-muted-foreground">{user.username || 'No username'}</div>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-success">
                          ₹{user.wallet?.balance?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : '-'}
                        </TableCell>
                        <TableCell>
                          {user.isBlocked ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge variant="default" className="bg-success text-success-foreground">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/users/${user.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total || 0)} of {data.total || 0} users
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={data.users.length < 20}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
