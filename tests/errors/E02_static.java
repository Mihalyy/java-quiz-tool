public class Main {
    int count = 0;
    void inc() { count++; }
    public static void main(String[] args) {
        count = 5;
        inc();
        System.out.println(this.count);
    }
}
