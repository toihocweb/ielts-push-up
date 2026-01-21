'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
    const [user, setUser] = useState<any>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.navLeft}>
                <Link href="/" className={styles.logo}>IELTS Push-Up</Link>
            </div>

            <div className={styles.navCenter}>
                <Link href="/" className={styles.link}>Home</Link>
                <Link href="/samples" className={styles.link}>Samples</Link>
                {user && (
                    <Link href="/admin" className={styles.link}>Admin</Link>
                )}
            </div>

            <div className={styles.navRight}>
                {user ? (
                    <a href="#" onClick={handleLogout} className={styles.loginBtn}>
                        Logout
                    </a>
                ) : (
                    <Link href="/login" className={styles.loginBtn}>
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}
