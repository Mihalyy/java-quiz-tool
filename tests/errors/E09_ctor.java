class Animal {
    String name;
    Animal(String name) { this.name = name; }
}
class Dog extends Animal {
    Dog() { System.out.println("dog"); }
}
class Cat extends Animal { }
class Bird extends Animal {
    Bird() { System.out.println("x"); super("b"); }
}
public class Main {
    public static void main(String[] args) {
        Animal a = new Animal();
        Animal b = new Animal("x", 1);
        Animal c = new Animal(5);
    }
}
